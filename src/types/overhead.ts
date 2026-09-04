export type OverheadCategory = {
  id: string;
  group_name: string;
  item_name: string;
  group_sort_order: number;
  item_sort_order: number;
  is_active: boolean;
};

export type OverheadExpense = {
  id: string;
  category_id: string;
  expense_date: string;
  accrual_month: string;
  amount: number;
  memo: string | null;
  created_by_user_id: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type OverheadExpenseWithCategory = OverheadExpense & {
  category: OverheadCategory;
};

export type OverheadGroupSummary = {
  group_name: string;
  group_sort_order: number;
  total_amount: number;
};
