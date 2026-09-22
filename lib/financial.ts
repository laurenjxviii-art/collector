export type FinancialAccountType =
  | 'checking' | 'savings' | 'cash' | 'credit_card' | 'investment'
  | 'student_loan' | 'auto_loan' | 'mortgage' | 'personal_loan'
  | 'other_asset' | 'other_liability';

export type FinancialAccount = {
  id:string;
  type:FinancialAccountType;
  name:string;
  institution:string;
  currentBalance:number;
  availableBalance?:number;
  currency:'USD';
  isManual:boolean;
  isConnected:boolean;
  apr?:number;
  creditLimit?:number;
  minimumPayment?:number;
  dueDay?:number;
  createdAt:string;
  updatedAt:string;
};

export type TransactionDirection='income'|'expense'|'transfer';
export type FinancialTransaction = {
  id:string;
  accountId?:string;
  date:string;
  amount:number;
  direction:TransactionDirection;
  merchant:string;
  category:string;
  subcategory:string;
  description:string;
  isRecurring:boolean;
  isHobby:boolean;
  portfolioItemId?:string;
  productId?:string;
  preorderProductId?:string;
  saleId?:string;
  createdAt:string;
  updatedAt:string;
};

export type BudgetPeriod='weekly'|'monthly'|'annual'|'custom';
export type FinancialBudget = {
  id:string;
  name:string;
  period:BudgetPeriod;
  amount:number;
  category?:string;
  active:boolean;
  createdAt:string;
  updatedAt:string;
};

export type BillFrequency='weekly'|'monthly'|'quarterly'|'annual'|'custom';
export type FinancialBill = {
  id:string;
  name:string;
  amount:number;
  dueDay?:number;
  nextDueDate?:string;
  frequency:BillFrequency;
  category:string;
  autopay:boolean;
  accountId?:string;
  active:boolean;
  createdAt:string;
  updatedAt:string;
};

export type FinancialGoalType='emergency'|'debt'|'vacation'|'grail'|'setup'|'car'|'moving'|'custom';
export type FinancialGoal = {
  id:string;
  name:string;
  type:FinancialGoalType;
  targetAmount:number;
  currentAmount:number;
  targetDate?:string;
  linkedWishlistItemId?:string;
  linkedSetupId?:string;
  status:'active'|'complete'|'paused';
  createdAt:string;
  updatedAt:string;
};

export type FinancialData = {
  accounts:FinancialAccount[];
  transactions:FinancialTransaction[];
  budgets:FinancialBudget[];
  bills:FinancialBill[];
  goals:FinancialGoal[];
};

export const EMPTY_FINANCIAL:FinancialData={
  accounts:[],
  transactions:[],
  budgets:[],
  bills:[],
  goals:[]
};

export const ASSET_ACCOUNT_TYPES:FinancialAccountType[]=['checking','savings','cash','investment','other_asset'];
export const DEBT_ACCOUNT_TYPES:FinancialAccountType[]=['credit_card','student_loan','auto_loan','mortgage','personal_loan','other_liability'];

export function financialAccountIsDebt(account:FinancialAccount){
  return DEBT_ACCOUNT_TYPES.includes(account.type);
}

export function financialCash(data:FinancialData){
  return data.accounts
    .filter(account=>['checking','savings','cash'].includes(account.type))
    .reduce((sum,account)=>sum+account.currentBalance,0);
}

export function financialDebt(data:FinancialData){
  return data.accounts
    .filter(financialAccountIsDebt)
    .reduce((sum,account)=>sum+Math.max(0,account.currentBalance),0);
}

export function financialNetWorth(data:FinancialData){
  const assets=data.accounts
    .filter(account=>ASSET_ACCOUNT_TYPES.includes(account.type))
    .reduce((sum,account)=>sum+account.currentBalance,0);
  return assets-financialDebt(data);
}

export function expenseTotal(data:FinancialData,start:string,end:string,predicate?:(tx:FinancialTransaction)=>boolean){
  return data.transactions
    .filter(tx=>tx.direction==='expense'&&tx.date>=start&&tx.date<=end&&(!predicate||predicate(tx)))
    .reduce((sum,tx)=>sum+tx.amount,0);
}

export function incomeTotal(data:FinancialData,start:string,end:string,predicate?:(tx:FinancialTransaction)=>boolean){
  return data.transactions
    .filter(tx=>tx.direction==='income'&&tx.date>=start&&tx.date<=end&&(!predicate||predicate(tx)))
    .reduce((sum,tx)=>sum+tx.amount,0);
}

function finiteNumber(value:unknown,minimum=0){
  return typeof value==='number'&&Number.isFinite(value)&&value>=minimum;
}
function optionalString(value:unknown){return value===undefined||typeof value==='string'}
function optionalFinite(value:unknown,minimum=0){return value===undefined||finiteNumber(value,minimum)}
function validDateString(value:unknown){return typeof value==='string'&&value.length>0&&Number.isFinite(Date.parse(value))}
function optionalDateString(value:unknown){return value===undefined||validDateString(value)}

export function validFinancialData(value:unknown):value is FinancialData{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const data=value as FinancialData;
  if(!Array.isArray(data.accounts)||!Array.isArray(data.transactions)||!Array.isArray(data.budgets)||!Array.isArray(data.bills)||!Array.isArray(data.goals))return false;
  if(!data.accounts.every(account=>account&&
    typeof account.id==='string'&&
    ['checking','savings','cash','credit_card','investment','student_loan','auto_loan','mortgage','personal_loan','other_asset','other_liability'].includes(account.type)&&
    typeof account.name==='string'&&typeof account.institution==='string'&&
    finiteNumber(account.currentBalance)&&
    optionalFinite(account.availableBalance)&&
    account.currency==='USD'&&typeof account.isManual==='boolean'&&typeof account.isConnected==='boolean'&&
    optionalFinite(account.apr)&&optionalFinite(account.creditLimit)&&optionalFinite(account.minimumPayment)&&
    (account.dueDay===undefined||(Number.isInteger(account.dueDay)&&account.dueDay>=1&&account.dueDay<=31))&&
    validDateString(account.createdAt)&&validDateString(account.updatedAt)
  ))return false;
  if(!data.transactions.every(tx=>tx&&typeof tx.id==='string'&&optionalString(tx.accountId)&&validDateString(tx.date)&&
    finiteNumber(tx.amount)&&['income','expense','transfer'].includes(tx.direction)&&
    ['merchant','category','subcategory','description'].every(key=>typeof (tx as unknown as Record<string,unknown>)[key]==='string')&&
    typeof tx.isRecurring==='boolean'&&typeof tx.isHobby==='boolean'&&
    ['portfolioItemId','productId','preorderProductId','saleId'].every(key=>optionalString((tx as unknown as Record<string,unknown>)[key]))&&
    validDateString(tx.createdAt)&&validDateString(tx.updatedAt)
  ))return false;
  if(!data.budgets.every(budget=>budget&&typeof budget.id==='string'&&typeof budget.name==='string'&&
    ['weekly','monthly','annual','custom'].includes(budget.period)&&finiteNumber(budget.amount)&&optionalString(budget.category)&&
    typeof budget.active==='boolean'&&validDateString(budget.createdAt)&&validDateString(budget.updatedAt)
  ))return false;
  if(!data.bills.every(bill=>bill&&typeof bill.id==='string'&&typeof bill.name==='string'&&finiteNumber(bill.amount)&&
    (bill.dueDay===undefined||(Number.isInteger(bill.dueDay)&&bill.dueDay>=1&&bill.dueDay<=31))&&optionalDateString(bill.nextDueDate)&&
    ['weekly','monthly','quarterly','annual','custom'].includes(bill.frequency)&&typeof bill.category==='string'&&
    typeof bill.autopay==='boolean'&&optionalString(bill.accountId)&&typeof bill.active==='boolean'&&
    validDateString(bill.createdAt)&&validDateString(bill.updatedAt)
  ))return false;
  if(!data.goals.every(goal=>goal&&typeof goal.id==='string'&&typeof goal.name==='string'&&
    ['emergency','debt','vacation','grail','setup','car','moving','custom'].includes(goal.type)&&
    finiteNumber(goal.targetAmount)&&finiteNumber(goal.currentAmount)&&optionalDateString(goal.targetDate)&&
    optionalString(goal.linkedWishlistItemId)&&optionalString(goal.linkedSetupId)&&
    ['active','complete','paused'].includes(goal.status)&&validDateString(goal.createdAt)&&validDateString(goal.updatedAt)
  ))return false;
  return new Set(data.accounts.map(x=>x.id)).size===data.accounts.length&&
    new Set(data.transactions.map(x=>x.id)).size===data.transactions.length&&
    new Set(data.budgets.map(x=>x.id)).size===data.budgets.length&&
    new Set(data.bills.map(x=>x.id)).size===data.bills.length&&
    new Set(data.goals.map(x=>x.id)).size===data.goals.length;
}

export function normalizeFinancialData(value?:Partial<FinancialData>|null):FinancialData{
  return {
    accounts:Array.isArray(value?.accounts)?value!.accounts:[],
    transactions:Array.isArray(value?.transactions)?value!.transactions:[],
    budgets:Array.isArray(value?.budgets)?value!.budgets:[],
    bills:Array.isArray(value?.bills)?value!.bills:[],
    goals:Array.isArray(value?.goals)?value!.goals:[]
  };
}

export function newFinancialId(prefix:string){
  return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
}
