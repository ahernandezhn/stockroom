import "server-only";

import { z } from "zod";

import { RequestStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

const requestIdSchema = z.uuid();

export const fulfillRequestErrorCodes = {
  invalidRequestId: "INVALID_REQUEST_ID",
  requestNotFound: "REQUEST_NOT_FOUND",
  insufficientStock: "INSUFFICIENT_STOCK",
  invalidRequestState: "INVALID_REQUEST_STATE",
} as const;

export type FulfillRequestErrorCode =
  (typeof fulfillRequestErrorCodes)[keyof typeof fulfillRequestErrorCodes];

type FulfillRequestErrorDetails = {
  availableStock?: number;
  requestedQuantity?: number;
};

export class FulfillRequestError extends Error {
  constructor(
    readonly code: FulfillRequestErrorCode,
    message: string,
    readonly details?: FulfillRequestErrorDetails,
  ) {
    super(message);
    this.name = "FulfillRequestError";
  }
}

export type FulfillRequestResult = {
  request: {
    id: string;
    itemId: string;
    quantity: number;
    status: typeof RequestStatus.FULFILLED;
    fulfilledAt: Date;
  };
  idempotent: boolean;
};

function fulfilledResult(
  request: {
    id: string;
    itemId: string;
    quantity: number;
    status: RequestStatus;
    fulfilledAt: Date | null;
  },
  idempotent: boolean,
): FulfillRequestResult {
  if (
    request.status !== RequestStatus.FULFILLED ||
    !request.fulfilledAt
  ) {
    throw new FulfillRequestError(
      fulfillRequestErrorCodes.invalidRequestState,
      "The stock request is in an invalid fulfillment state.",
    );
  }

  return {
    request: {
      ...request,
      status: RequestStatus.FULFILLED,
      fulfilledAt: request.fulfilledAt,
    },
    idempotent,
  };
}

export async function fulfillRequest(
  requestId: string,
): Promise<FulfillRequestResult> {
  const parsedRequestId = requestIdSchema.safeParse(requestId);

  if (!parsedRequestId.success) {
    throw new FulfillRequestError(
      fulfillRequestErrorCodes.invalidRequestId,
      "The stock request ID must be a valid UUID.",
    );
  }

  const fulfilledAt = new Date();

  return db.$transaction(
    async (tx) => {
      const claimedRequests = await tx.stockRequest.updateManyAndReturn({
        where: {
          id: parsedRequestId.data,
          status: RequestStatus.PENDING,
        },
        data: {
          status: RequestStatus.FULFILLED,
          fulfilledAt,
        },
        select: {
          id: true,
          itemId: true,
          quantity: true,
          status: true,
          fulfilledAt: true,
        },
      });

      const claimedRequest = claimedRequests[0];

      if (!claimedRequest) {
        const existingRequest = await tx.stockRequest.findUnique({
          where: { id: parsedRequestId.data },
          select: {
            id: true,
            itemId: true,
            quantity: true,
            status: true,
            fulfilledAt: true,
          },
        });

        if (!existingRequest) {
          throw new FulfillRequestError(
            fulfillRequestErrorCodes.requestNotFound,
            "Stock request not found.",
          );
        }

        if (existingRequest.status === RequestStatus.FULFILLED) {
          return fulfilledResult(existingRequest, true);
        }

        throw new FulfillRequestError(
          fulfillRequestErrorCodes.invalidRequestState,
          "The stock request cannot be fulfilled from its current state.",
        );
      }

      if (claimedRequest.status !== RequestStatus.FULFILLED) {
        throw new FulfillRequestError(
          fulfillRequestErrorCodes.invalidRequestState,
          "The stock request claim produced an invalid state.",
        );
      }

      const stockUpdate = await tx.item.updateMany({
        where: {
          id: claimedRequest.itemId,
          stock: {
            gte: claimedRequest.quantity,
          },
        },
        data: {
          stock: {
            decrement: claimedRequest.quantity,
          },
        },
      });

      if (stockUpdate.count !== 1) {
        const item = await tx.item.findUnique({
          where: { id: claimedRequest.itemId },
          select: { stock: true },
        });

        if (!item) {
          throw new FulfillRequestError(
            fulfillRequestErrorCodes.invalidRequestState,
            "The stock request references an unavailable item.",
          );
        }

        if (item.stock < claimedRequest.quantity) {
          throw new FulfillRequestError(
            fulfillRequestErrorCodes.insufficientStock,
            "There is not enough stock to fulfill this request.",
            {
              availableStock: item.stock,
              requestedQuantity: claimedRequest.quantity,
            },
          );
        }

        throw new FulfillRequestError(
          fulfillRequestErrorCodes.invalidRequestState,
          "The stock request could not be applied to inventory.",
        );
      }

      return fulfilledResult(claimedRequest, false);
    },
    {
      isolationLevel: "ReadCommitted",
    },
  );
}
