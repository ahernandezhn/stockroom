export type DashboardItem = {
  id: string;
  name: string;
  stock: number;
};

export type DashboardRequest = {
  id: string;
  requestedBy: string;
  quantity: number;
  createdAt: string;
  item: DashboardItem;
};

export type DashboardData = {
  items: DashboardItem[];
  requests: DashboardRequest[];
};
