alter table public.items add column identity jsonb not null default '{}' check(jsonb_typeof(identity)='object');
alter table public.items add column grading jsonb not null default '{"graded":false,"company":"","grade":"","certification":"","designation":""}' check(jsonb_typeof(grading)='object');
alter table public.items add column price_history jsonb not null default '[]' check(jsonb_typeof(price_history)='array');
alter table public.items add column comparables jsonb not null default '[]' check(jsonb_typeof(comparables)='array');
