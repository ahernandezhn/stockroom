import {
  fulfillRequest,
  fulfillRequestErrorCodes,
  FulfillRequestError,
  type FulfillRequestErrorCode,
} from "@/features/requests/server/fulfill-request";

const domainErrorStatus = {
  [fulfillRequestErrorCodes.invalidRequestId]: 400,
  [fulfillRequestErrorCodes.requestNotFound]: 404,
  [fulfillRequestErrorCodes.insufficientStock]: 409,
  [fulfillRequestErrorCodes.invalidRequestState]: 409,
} as const satisfies Record<FulfillRequestErrorCode, number>;

type FulfillRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  { params }: FulfillRouteContext,
): Promise<Response> {
  const { id } = await params;

  try {
    const result = await fulfillRequest(id);

    return Response.json({
      data: {
        request: {
          ...result.request,
          fulfilledAt: result.request.fulfilledAt.toISOString(),
        },
        idempotent: result.idempotent,
      },
    });
  } catch (error: unknown) {
    if (error instanceof FulfillRequestError) {
      return Response.json(
        {
          error: {
            code: error.code,
            message: error.message,
            ...(error.details ? { details: error.details } : {}),
          },
        },
        {
          status: domainErrorStatus[error.code],
        },
      );
    }

    console.error("Failed to fulfill stock request.", error);

    return Response.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "The stock request could not be fulfilled.",
        },
      },
      {
        status: 500,
      },
    );
  }
}
