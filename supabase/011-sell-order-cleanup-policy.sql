
drop policy if exists sell_orders_delete_own on public.sell_orders;
create policy sell_orders_delete_own on public.sell_orders
for delete to authenticated
using (
  seller_user_id=(select auth.uid())
  and status in ('awaiting_payment','paid','cancelled')
);
