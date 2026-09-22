'use client';

import {useMemo,useState} from 'react';
import {
  AlertTriangle,ArrowDownRight,ArrowUpRight,CalendarDays,CircleDollarSign,
  CreditCard,Landmark,Link2,LockKeyhole,Plus,Receipt,ShieldCheck,Target,WalletCards
} from 'lucide-react';
import {useWorkspace} from '../lib/useWorkspace';
import {
  EMPTY_FINANCIAL,financialAccountIsDebt,financialCash,financialDebt,financialNetWorth,
  incomeTotal,expenseTotal,newFinancialId,normalizeFinancialData,
  type FinancialAccount,type FinancialAccountType,type FinancialBill,type FinancialBudget,
  type FinancialGoal,type FinancialTransaction,type TransactionDirection
} from '../lib/financial';
import {preorderCommitment,grailProgress} from '../lib/wishlist';
import {normalizePlatformState} from '../lib/platform';

type Tab='Overview'|'Accounts'|'Spending'|'Budget'|'Debt'|'Bills'|'Goals'|'Collection'|'Reports';
type Composer='account'|'transaction'|'budget'|'bill'|'goal'|null;

const ACCOUNT_LABELS:Record<FinancialAccountType,string>={
  checking:'Checking',savings:'Savings',cash:'Cash',credit_card:'Credit Card',investment:'Investment',
  student_loan:'Student Loan',auto_loan:'Auto Loan',mortgage:'Mortgage',personal_loan:'Personal Loan',
  other_asset:'Other Asset',other_liability:'Other Liability'
};
const CATEGORIES=['Income','Housing','Utilities','Food','Transportation','Insurance','Health','Entertainment','Shopping','Subscriptions','Debt Payments','Savings','Investments','Collectibles','Preorders','Shipping','Seller Fees','Grading','Authentication','Display Furniture','Storage','Conventions','Hobby Travel','Repairs','Supplies','Marketplace Purchases','Marketplace Sales'];
const GOAL_TYPES=['emergency','debt','vacation','setup','car','moving','custom'] as const;

function money(value:number){
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
}
function exactMoney(value:number){
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
}
function isoNow(){return new Date().toISOString()}
function currentMonthKey(){return new Date().toISOString().slice(0,7)}
function monthRange(key:string){return {start:key+'-01',end:key+'-31'}}
function safeNumber(value:string){const n=Number(value);return Number.isFinite(n)&&n>=0?n:0}
function pct(value:number,total:number){return total>0?Math.max(0,Math.min(100,Math.round(value/total*100))):0}
function dateLabel(value?:string){
  if(!value)return 'Not set';
  const d=new Date(value+'T12:00:00');
  return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(d):value;
}

function Metric({label,value,sub,tone='muted'}:{label:string;value:string;sub:string;tone?:'muted'|'green'|'red'|'orange'}){
  return <section className="vxf-metric"><span>{label}</span><strong>{value}</strong><small className={'tone-'+tone}>{sub}</small></section>;
}
function Head({title,action}:{title:string;action?:React.ReactNode}){
  return <header className="vxf-panel-head"><div><h3>{title}</h3></div>{action}</header>;
}

export default function VexumFinancial(){
  const workspace=useWorkspace();
  const [tab,setTab]=useState<Tab>('Overview');
  const [composer,setComposer]=useState<Composer>(null);
  const [budgetDraft,setBudgetDraft]=useState('');
  const [debtExtra,setDebtExtra]=useState('100');

  const financial=normalizeFinancialData(workspace.data.financial||EMPTY_FINANCIAL);
  const platform=normalizePlatformState(workspace.data.platform,true);
  const externalFinanceConnected=platform.connections.financial.status==='connected'&&platform.connections.financial.provider==='plaid';
  const externalFinanceLocked=platform.security.requireMfaForExternalFinancial&&platform.security.mfaStatus!=='verified';
  const owned=workspace.data.items.filter(item=>item.status==='owned');
  const sold=workspace.data.items.filter(item=>item.status==='sold');
  const wishlist=Object.values(workspace.data.wishlist||{}).filter(record=>!record.archived);
  const month=currentMonthKey();
  const range=monthRange(month);
  const linkedPurchases=new Set(financial.transactions.filter(tx=>tx.portfolioItemId).map(tx=>tx.portfolioItemId));
  const txHobbySpend=expenseTotal(financial,range.start,range.end,tx=>tx.isHobby);
  const portfolioSpend=owned.filter(item=>item.purchaseDate.startsWith(month)&&!linkedPurchases.has(item.id)).reduce((sum,item)=>sum+item.purchasePrice*item.quantity,0);
  const hobbySpend=txHobbySpend+portfolioSpend;
  const collectionValue=owned.reduce((sum,item)=>sum+item.currentValue*item.quantity,0);
  const costBasis=owned.reduce((sum,item)=>sum+item.purchasePrice*item.quantity,0);
  const quickSaleKnown=owned.reduce((sum,item)=>{
    const raw=item.customFields?.['Quick Sale Value']||item.customFields?.['Quick-Sale Value']||'';
    const parsed=Number(String(raw).replace(/[$,]/g,''));
    return sum+(Number.isFinite(parsed)&&parsed>=0?parsed*item.quantity:0);
  },0);
  const quickSaleCount=owned.filter(item=>{
    const raw=item.customFields?.['Quick Sale Value']||item.customFields?.['Quick-Sale Value']||'';
    const parsed=Number(String(raw).replace(/[$,]/g,''));
    return Number.isFinite(parsed)&&parsed>=0;
  }).length;
  const preorders=wishlist.filter(record=>record.preorder?.enabled&&record.preorder.status!=='Cancelled'&&record.preorder.status!=='Delivered');
  const preorderTotal=preorders.reduce((sum,record)=>sum+preorderCommitment(record)*record.quantityWanted,0);
  const preorder30=preorders.filter(record=>{
    const date=record.preorder?.estimatedChargeDate;
    if(!date)return false;
    const delta=Date.parse(date)-Date.now();
    return Number.isFinite(delta)&&delta>=0&&delta<=30*86400000;
  }).reduce((sum,record)=>sum+preorderCommitment(record)*record.quantityWanted,0);
  const legacyBudget=workspace.data.financialPreferences?.monthlyHobbyBudget;
  const overallBudget=financial.budgets.find(b=>b.active&&b.period==='monthly'&&!b.category)?.amount??legacyBudget;
  const budgetRemaining=overallBudget===undefined?undefined:overallBudget-hobbySpend;
  const monthIncome=incomeTotal(financial,range.start,range.end);
  const monthExpenses=expenseTotal(financial,range.start,range.end);
  const bills=financial.bills.filter(b=>b.active);
  const goals=financial.goals.filter(g=>g.status!=='complete');
  const grails=wishlist.filter(record=>record.priority==='Grail');

  const save=(next=financial)=>workspace.update({...workspace.data,financial:next});
  const setOverallBudget=()=>{
    const amount=safeNumber(budgetDraft);
    const now=isoNow();
    const current=financial.budgets.find(b=>b.active&&b.period==='monthly'&&!b.category);
    const budgets=current
      ?financial.budgets.map(b=>b.id===current.id?{...b,amount,updatedAt:now}:b)
      :[...financial.budgets,{id:newFinancialId('budget'),name:'Monthly Hobby Budget',period:'monthly' as const,amount,active:true,createdAt:now,updatedAt:now}];
    workspace.update({...workspace.data,financial:{...financial,budgets},financialPreferences:{...(workspace.data.financialPreferences||{}),monthlyHobbyBudget:amount}});
    setBudgetDraft('');
  };
  const removeAccount=(id:string)=>save({...financial,accounts:financial.accounts.filter(a=>a.id!==id),transactions:financial.transactions.map(tx=>tx.accountId===id?{...tx,accountId:undefined}:tx),bills:financial.bills.map(b=>b.accountId===id?{...b,accountId:undefined}:b)});
  const removeTransaction=(id:string)=>save({...financial,transactions:financial.transactions.filter(tx=>tx.id!==id)});
  const removeBudget=(id:string)=>save({...financial,budgets:financial.budgets.filter(b=>b.id!==id)});
  const removeBill=(id:string)=>save({...financial,bills:financial.bills.filter(b=>b.id!==id)});
  const removeGoal=(id:string)=>save({...financial,goals:financial.goals.filter(g=>g.id!==id)});

  const debtAccounts=financial.accounts.filter(financialAccountIsDebt);
  const plannedCurrent=wishlist.filter(r=>r.plannedMonth===month).reduce((sum,r)=>sum+(r.currentMarket??r.targetPrice??r.maximumPrice??0)*r.quantityWanted,0);
  const reports=useMemo(()=>[
    ['Income recorded',exactMoney(monthIncome)],
    ['Expenses recorded',exactMoney(monthExpenses)],
    ['Hobby spending',exactMoney(hobbySpend)],
    ['Collection market value',exactMoney(collectionValue)],
    ['Collection cost basis',exactMoney(costBasis)],
    ['Active preorder balance',exactMoney(preorderTotal)]
  ],[monthIncome,monthExpenses,hobbySpend,collectionValue,costBasis,preorderTotal]);

  if(!workspace.ready)return <div className="vxf-page"><div className="vxf-loading">Loading Financial workspace…</div></div>;

  return <div className="vxf-page">
    <section className="vxf-title">
      <div><span>FINANCIAL</span><h1>Collector Finance</h1><p>Money, obligations, hobby spending, collection economics, and future commitments—without pretending collectibles are cash.</p></div>
      <aside><strong>Private by default</strong><small>Financial records never feed Social automatically.</small></aside>
    </section>

    <section className={'vxf-security-gate '+(externalFinanceConnected?'connected':'')}>
      <div className="icon">{externalFinanceConnected?<ShieldCheck/>:externalFinanceLocked?<LockKeyhole/>:<Link2/>}</div>
      <div><strong>{externalFinanceConnected?'External financial accounts connected':externalFinanceLocked?'External accounts locked until MFA is verified':'External financial connection not configured'}</strong><p>{externalFinanceConnected?'Connected account state is recorded in VEXUM Settings.':'Your manual Financial ledger remains fully usable. VEXUM will not fabricate Plaid balances or bank transactions; external connections require a real provider flow'+(externalFinanceLocked?' and verified MFA.':'.')}</p></div>
      <button onClick={()=>location.assign('/settings')}>Security & Connections</button>
    </section>

    <nav className="vxf-tabs">{(['Overview','Accounts','Spending','Budget','Debt','Bills','Goals','Collection','Reports'] as Tab[]).map(name=><button key={name} className={tab===name?'active':''} onClick={()=>{setTab(name);setComposer(null)}}>{name}</button>)}</nav>

    {tab==='Overview'&&<>
      <div className="vxf-metrics">
        <Metric label="Cash" value={financial.accounts.length?money(financialCash(financial)):'Not set'} sub={financial.accounts.length?'Manual accounts':'Add manual accounts'} />
        <Metric label="Debt" value={debtAccounts.length?money(financialDebt(financial)):'Not set'} sub={debtAccounts.length?debtAccounts.length+' debt account'+(debtAccounts.length===1?'':'s'):'No debt accounts recorded'} tone={debtAccounts.length?'orange':'muted'}/>
        <Metric label="Financial Net Worth" value={financial.accounts.length?money(financialNetWorth(financial)):'Not set'} sub="Accounts only · collection excluded" tone={financial.accounts.length&&financialNetWorth(financial)>=0?'green':'muted'}/>
        <Metric label="Collection Value" value={money(collectionValue)} sub="Estimated market value" tone="green"/>
        <Metric label="Collection Cost Basis" value={money(costBasis)} sub="Recorded acquisition cost"/>
        <Metric label="Hobby Spend This Month" value={overallBudget!==undefined?money(hobbySpend)+' / '+money(overallBudget):money(hobbySpend)} sub={overallBudget===undefined?'No target set':(budgetRemaining!==undefined&&budgetRemaining<0?money(Math.abs(budgetRemaining))+' over target':money(Math.max(0,budgetRemaining||0))+' remaining')} tone={budgetRemaining!==undefined&&budgetRemaining<0?'red':'muted'}/>
        <Metric label="Upcoming Commitments" value={money(preorderTotal)} sub={money(preorder30)+' preorder balance due in 30 days'} tone="orange"/>
        <Metric label="Resale Profit This Month" value="Unavailable" sub="Sell ledger not connected"/>
      </div>

      <div className="vxf-grid-main">
        <section className="vxf-panel">
          <Head title="Monthly Hobby Budget" action={<button onClick={()=>setTab('Budget')}>Open Budget</button>}/>
          {overallBudget===undefined?<div className="vxf-empty compact"><WalletCards/><strong>No hobby budget yet</strong><p>Set a target without connecting a bank account.</p><div className="vxf-inline-input"><span>$</span><input inputMode="decimal" value={budgetDraft} onChange={e=>setBudgetDraft(e.target.value)} placeholder="300"/><button onClick={setOverallBudget}>Set target</button></div></div>:<div className="vxf-budget">
            <div><strong>{exactMoney(hobbySpend)}</strong><span>of {exactMoney(overallBudget)}</span><b>{pct(hobbySpend,overallBudget)}%</b></div>
            <div className="vxf-progress"><i style={{width:Math.min(100,pct(hobbySpend,overallBudget))+'%'}}/></div>
            <div className="vxf-budget-breakdown"><span><b>{exactMoney(txHobbySpend)}</b>Transactions</span><span><b>{exactMoney(portfolioSpend)}</b>Unlinked Portfolio buys</span><span><b>{exactMoney(plannedCurrent)}</b>Wishlist planned</span></div>
          </div>}
        </section>

        <section className="vxf-panel">
          <Head title="Upcoming Commitments" action={<button onClick={()=>setTab('Bills')}>Bills</button>}/>
          <div className="vxf-commit-list">
            {preorders.slice(0,4).map(record=><div key={record.productId}><CalendarDays/><span><strong>{record.snapshot?.name||record.productId}</strong><small>{record.preorder?.estimatedChargeDate?dateLabel(record.preorder.estimatedChargeDate):'Charge date unknown'} · {record.preorder?.retailer||'Retailer not set'}</small></span><b>{exactMoney(preorderCommitment(record)*record.quantityWanted)}</b></div>)}
            {bills.slice(0,4).map(bill=><div key={bill.id}><Receipt/><span><strong>{bill.name}</strong><small>{bill.nextDueDate?dateLabel(bill.nextDueDate):bill.dueDay?'Day '+bill.dueDay:'Due date not set'} · {bill.frequency}</small></span><b>{exactMoney(bill.amount)}</b></div>)}
            {!preorders.length&&!bills.length?<div className="vxf-empty-row">No preorder or bill commitments recorded.</div>:null}
          </div>
        </section>

        <section className="vxf-panel">
          <Head title="Collection ≠ Cash"/>
          <div className="vxf-liquidity">
            <div><span>Estimated market value</span><strong>{exactMoney(collectionValue)}</strong><small>Owned Portfolio valuation</small></div>
            <div><span>Cost basis</span><strong>{exactMoney(costBasis)}</strong><small>What was actually recorded as paid</small></div>
            <div><span>Quick-sale value</span><strong>{quickSaleCount?exactMoney(quickSaleKnown):'Unavailable'}</strong><small>{quickSaleCount?quickSaleCount+' item'+(quickSaleCount===1?'':'s')+' have explicit quick-sale values':'VEXUM will not invent a liquidity discount'}</small></div>
          </div>
        </section>

        <section className="vxf-panel">
          <Head title="Connected Financial Data"/>
          <div className="vxf-empty"><Landmark/><strong>Bank connection not configured</strong><p>Manual Financial works now. Checking sync, card feeds, investments, loan balances, and external credentials remain unavailable until an authorized financial data provider is configured.</p></div>
        </section>
      </div>
    </>}

    {tab==='Accounts'&&<section className="vxf-panel vxf-full">
      <Head title="Accounts" action={<button className="red" onClick={()=>setComposer(composer==='account'?null:'account')}><Plus/>Add Manual Account</button>}/>
      {composer==='account'?<AccountForm onCancel={()=>setComposer(null)} onSave={account=>{save({...financial,accounts:[...financial.accounts,account]});setComposer(null)}}/>:null}
      <div className="vxf-account-grid">
        {financial.accounts.map(account=><article key={account.id} className="vxf-account"><header><span className={financialAccountIsDebt(account)?'debt':'asset'}>{financialAccountIsDebt(account)?<CreditCard/>:<Landmark/>}</span><div><strong>{account.name}</strong><small>{account.institution||ACCOUNT_LABELS[account.type]} · Manual</small></div><button onClick={()=>removeAccount(account.id)}>Remove</button></header><b>{exactMoney(account.currentBalance)}</b><footer><span>{ACCOUNT_LABELS[account.type]}</span>{account.apr!==undefined?<span>{account.apr}% APR</span>:null}{account.creditLimit!==undefined?<span>{money(account.creditLimit)} limit</span>:null}</footer></article>)}
        {!financial.accounts.length?<div className="vxf-empty wide"><Landmark/><strong>No financial accounts recorded</strong><p>Add manual balances now. Connected accounts are intentionally unavailable until a secure provider is configured.</p></div>:null}
      </div>
      <div className="vxf-boundary"><AlertTriangle/><span><strong>Connection boundary</strong> VEXUM does not store banking credentials and no live institution connector is configured.</span></div>
    </section>}

    {tab==='Spending'&&<section className="vxf-panel vxf-full">
      <Head title="Transactions" action={<button className="red" onClick={()=>setComposer(composer==='transaction'?null:'transaction')}><Plus/>Add Transaction</button>}/>
      {composer==='transaction'?<TransactionForm accounts={financial.accounts} items={owned} onCancel={()=>setComposer(null)} onSave={tx=>{save({...financial,transactions:[tx,...financial.transactions]});setComposer(null)}}/>:null}
      <div className="vxf-table">
        <div className="vxf-table-head"><span>Date</span><span>Merchant</span><span>Category</span><span>Account</span><span>Hobby</span><span>Amount</span><span/></div>
        {financial.transactions.map(tx=><div key={tx.id}><span>{dateLabel(tx.date)}</span><span><strong>{tx.merchant||tx.description||'Transaction'}</strong><small>{tx.subcategory}</small></span><span>{tx.category}</span><span>{financial.accounts.find(a=>a.id===tx.accountId)?.name||'Unassigned'}</span><span>{tx.isHobby?'Yes':'—'}</span><b className={tx.direction==='income'?'tone-green':tx.direction==='expense'?'tone-red':''}>{tx.direction==='income'?'+':tx.direction==='expense'?'−':''}{exactMoney(tx.amount)}</b><button onClick={()=>removeTransaction(tx.id)}>×</button></div>)}
        {!financial.transactions.length?<div className="vxf-empty-row">No Financial transactions recorded. Portfolio purchases still contribute to hobby-spend context until linked transactions exist.</div>:null}
      </div>
    </section>}

    {tab==='Budget'&&<div className="vxf-two">
      <section className="vxf-panel">
        <Head title="Overall Hobby Budget"/>
        <div className="vxf-budget-editor"><label>Monthly target<div><span>$</span><input inputMode="decimal" value={budgetDraft} onChange={e=>setBudgetDraft(e.target.value)} placeholder={overallBudget!==undefined?String(overallBudget):'300'}/><button onClick={setOverallBudget}>{overallBudget===undefined?'Set':'Update'}</button></div></label>{overallBudget!==undefined?<><div className="vxf-budget-big"><strong>{exactMoney(hobbySpend)}</strong><span>/ {exactMoney(overallBudget)}</span></div><div className="vxf-progress"><i style={{width:Math.min(100,pct(hobbySpend,overallBudget))+'%'}}/></div><p>{budgetRemaining!==undefined&&budgetRemaining<0?exactMoney(Math.abs(budgetRemaining))+' above your current target.':exactMoney(Math.max(0,budgetRemaining||0))+' remains against your current target.'}</p></>:null}</div>
      </section>
      <section className="vxf-panel">
        <Head title="Category Budgets" action={<button onClick={()=>setComposer(composer==='budget'?null:'budget')}><Plus/>Add</button>}/>
        {composer==='budget'?<BudgetForm onCancel={()=>setComposer(null)} onSave={budget=>{save({...financial,budgets:[...financial.budgets,budget]});setComposer(null)}}/>:null}
        <div className="vxf-mini-list">{financial.budgets.filter(b=>b.category).map(budget=><div key={budget.id}><span><strong>{budget.name}</strong><small>{budget.category} · {budget.period}</small></span><b>{exactMoney(budget.amount)}</b><button onClick={()=>removeBudget(budget.id)}>×</button></div>)}{!financial.budgets.some(b=>b.category)?<div className="vxf-empty-row">Sub-budgets are optional.</div>:null}</div>
      </section>
    </div>}

    {tab==='Debt'&&<section className="vxf-panel vxf-full">
      <Head title="Debt"/>
      {!debtAccounts.length?<div className="vxf-empty"><CreditCard/><strong>No debt accounts recorded</strong><p>Add a manual credit card or loan under Accounts to model balances, APR, utilization, and payment scenarios.</p></div>:<div className="vxf-debt-grid">{debtAccounts.map(account=><DebtCard key={account.id} account={account} extra={safeNumber(debtExtra)}/>)}</div>}
      {debtAccounts.length?<div className="vxf-debt-control"><label>Scenario extra payment / month <span>$</span><input inputMode="decimal" value={debtExtra} onChange={e=>setDebtExtra(e.target.value)}/></label><small>Scenario math uses the recorded balance/APR/minimum payment only. It does not modify an account or initiate payments.</small></div>:null}
      <div className="vxf-context-pair"><div><span>Last 30 days · hobby spending</span><strong>{exactMoney(hobbySpend)}</strong></div><div><span>Debt balances recorded</span><strong>{exactMoney(financialDebt(financial))}</strong></div></div>
    </section>}

    {tab==='Bills'&&<section className="vxf-panel vxf-full">
      <Head title="Bills + Commitments" action={<button className="red" onClick={()=>setComposer(composer==='bill'?null:'bill')}><Plus/>Add Bill</button>}/>
      {composer==='bill'?<BillForm accounts={financial.accounts} onCancel={()=>setComposer(null)} onSave={bill=>{save({...financial,bills:[...financial.bills,bill]});setComposer(null)}}/>:null}
      <div className="vxf-calendar-list">
        {bills.map(bill=><div key={bill.id}><time>{bill.nextDueDate?dateLabel(bill.nextDueDate):bill.dueDay?'Day '+bill.dueDay:'No date'}</time><span><strong>{bill.name}</strong><small>{bill.category} · {bill.frequency}{bill.autopay?' · Autopay':''}</small></span><b>{exactMoney(bill.amount)}</b><button onClick={()=>removeBill(bill.id)}>×</button></div>)}
        {preorders.map(record=><div key={record.productId} className="preorder"><time>{record.preorder?.estimatedChargeDate?dateLabel(record.preorder.estimatedChargeDate):'Unknown'}</time><span><strong>{record.snapshot?.name||record.productId}</strong><small>Wishlist preorder · {record.preorder?.retailer||'Retailer not set'}</small></span><b>{exactMoney(preorderCommitment(record)*record.quantityWanted)}</b><em>Wishlist source</em></div>)}
        {!bills.length&&!preorders.length?<div className="vxf-empty-row">No bills or preorder commitments recorded.</div>:null}
      </div>
    </section>}

    {tab==='Goals'&&<div className="vxf-two">
      <section className="vxf-panel">
        <Head title="Financial Goals" action={<button onClick={()=>setComposer(composer==='goal'?null:'goal')}><Plus/>Add Goal</button>}/>
        {composer==='goal'?<GoalForm onCancel={()=>setComposer(null)} onSave={goal=>{save({...financial,goals:[...financial.goals,goal]});setComposer(null)}}/>:null}
        <div className="vxf-goals">{goals.map(goal=><div key={goal.id}><Target/><span><strong>{goal.name}</strong><small>{exactMoney(goal.currentAmount)} / {exactMoney(goal.targetAmount)}{goal.targetDate?' · '+dateLabel(goal.targetDate):''}</small><i><b style={{width:pct(goal.currentAmount,goal.targetAmount)+'%'}}/></i></span><em>{pct(goal.currentAmount,goal.targetAmount)}%</em><button onClick={()=>removeGoal(goal.id)}>×</button></div>)}{!goals.length?<div className="vxf-empty-row">No standalone Financial goals.</div>:null}</div>
      </section>
      <section className="vxf-panel">
        <Head title="Grail Goals · Wishlist Source"/>
        <div className="vxf-goals">{grails.map(record=><div key={record.productId}><Target/><span><strong>{record.snapshot?.name||record.productId}</strong><small>{exactMoney(record.grail?.savedAmount||0)} / {exactMoney(record.grail?.goalAmount??record.targetPrice??0)}</small><i><b style={{width:grailProgress(record)+'%'}}/></i></span><em>{grailProgress(record)}%</em></div>)}{!grails.length?<div className="vxf-empty-row">No Grail goals are active in Wishlist.</div>:null}</div>
      </section>
    </div>}

    {tab==='Collection'&&<>
      <div className="vxf-collection-metrics"><Metric label="Market Value" value={exactMoney(collectionValue)} sub={owned.length+' owned records'} tone="green"/><Metric label="Cost Basis" value={exactMoney(costBasis)} sub="Recorded acquisition cost"/><Metric label="Unrealized Difference" value={exactMoney(collectionValue-costBasis)} sub="Not realized until sold" tone={collectionValue>=costBasis?'green':'red'}/><Metric label="Quick-Sale Estimate" value={quickSaleCount?exactMoney(quickSaleKnown):'Unavailable'} sub={quickSaleCount?quickSaleCount+' explicit values':'No invented liquidity discount'}/></div>
      <section className="vxf-panel vxf-full"><Head title="Collection Financials"/><div className="vxf-table collection"><div className="vxf-table-head"><span>Item</span><span>Condition</span><span>Paid</span><span>Market</span><span>Difference</span><span>Location</span><span/></div>{owned.slice().sort((a,b)=>b.currentValue*b.quantity-a.currentValue*a.quantity).map(item=><div key={item.id}><span><strong>{item.name}</strong><small>{item.category} · ×{item.quantity}</small></span><span>{item.condition}</span><b>{exactMoney(item.purchasePrice*item.quantity)}</b><b>{exactMoney(item.currentValue*item.quantity)}</b><b className={item.currentValue>=item.purchasePrice?'tone-green':'tone-red'}>{exactMoney((item.currentValue-item.purchasePrice)*item.quantity)}</b><span>{item.location||'Unassigned in Setup'}</span><span/></div>)}</div></section>
    </>}

    {tab==='Reports'&&<div className="vxf-reports">
      <section className="vxf-panel"><Head title="Monthly Financial Summary"/>{reports.map(row=><div className="vxf-report-row" key={row[0]}><span>{row[0]}</span><strong>{row[1]}</strong></div>)}</section>
      <section className="vxf-panel"><Head title="Data Coverage"/><div className="vxf-coverage"><div><b>{financial.accounts.length}</b><span>manual accounts</span></div><div><b>{financial.transactions.length}</b><span>transactions</span></div><div><b>{bills.length}</b><span>active bills</span></div><div><b>{owned.length}</b><span>owned Portfolio records</span></div><div><b>{sold.length}</b><span>sold Portfolio records</span></div><div><b>{preorders.length}</b><span>active preorders</span></div></div><p className="vxf-note">Reports only use records currently stored in VEXUM. Bank feeds, investment feeds, tax data, and a complete Sell ledger are not connected.</p></section>
    </div>}
  </div>;
}

function AccountForm({onSave,onCancel}:{onSave:(account:FinancialAccount)=>void;onCancel:()=>void}){
  const [name,setName]=useState('');
  const [institution,setInstitution]=useState('');
  const [type,setType]=useState<FinancialAccountType>('checking');
  const [balance,setBalance]=useState('');
  const [apr,setApr]=useState('');
  const [limit,setLimit]=useState('');
  const [minimum,setMinimum]=useState('');
  const [dueDay,setDueDay]=useState('');
  const debt=['credit_card','student_loan','auto_loan','mortgage','personal_loan','other_liability'].includes(type);
  const submit=()=>{
    if(!name.trim())return;
    const now=isoNow();
    onSave({id:newFinancialId('acct'),type,name:name.trim(),institution:institution.trim(),currentBalance:safeNumber(balance),currency:'USD',isManual:true,isConnected:false,apr:debt&&apr.trim()?safeNumber(apr):undefined,creditLimit:type==='credit_card'&&limit.trim()?safeNumber(limit):undefined,minimumPayment:debt&&minimum.trim()?safeNumber(minimum):undefined,dueDay:debt&&dueDay.trim()?Math.max(1,Math.min(31,Math.round(safeNumber(dueDay)))):undefined,createdAt:now,updatedAt:now});
  };
  return <div className="vxf-composer"><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Everyday Checking"/></label><label>Type<select value={type} onChange={e=>setType(e.target.value as FinancialAccountType)}>{Object.entries(ACCOUNT_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Institution<input value={institution} onChange={e=>setInstitution(e.target.value)} placeholder="Optional"/></label><label>Balance<input inputMode="decimal" value={balance} onChange={e=>setBalance(e.target.value)} placeholder="0.00"/></label>{debt?<><label>APR %<input inputMode="decimal" value={apr} onChange={e=>setApr(e.target.value)} placeholder="0"/></label><label>Minimum payment<input inputMode="decimal" value={minimum} onChange={e=>setMinimum(e.target.value)} placeholder="0"/></label><label>Due day<input inputMode="numeric" value={dueDay} onChange={e=>setDueDay(e.target.value)} placeholder="15"/></label></>:null}{type==='credit_card'?<label>Credit limit<input inputMode="decimal" value={limit} onChange={e=>setLimit(e.target.value)} placeholder="5000"/></label>:null}<footer><button onClick={onCancel}>Cancel</button><button className="red" onClick={submit}>Save account</button></footer></div>;
}

function TransactionForm({accounts,items,onSave,onCancel}:{accounts:FinancialAccount[];items:Array<{id:string;name:string}>;onSave:(tx:FinancialTransaction)=>void;onCancel:()=>void}){
  const [direction,setDirection]=useState<TransactionDirection>('expense');
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [amount,setAmount]=useState('');
  const [merchant,setMerchant]=useState('');
  const [category,setCategory]=useState('Collectibles');
  const [subcategory,setSubcategory]=useState('');
  const [accountId,setAccountId]=useState('');
  const [itemId,setItemId]=useState('');
  const [hobby,setHobby]=useState(true);
  const submit=()=>{if(!amount.trim())return;const now=isoNow();onSave({id:newFinancialId('tx'),date,amount:safeNumber(amount),direction,merchant:merchant.trim(),category,subcategory:subcategory.trim(),description:'',isRecurring:false,isHobby:hobby,accountId:accountId||undefined,portfolioItemId:itemId||undefined,createdAt:now,updatedAt:now})};
  return <div className="vxf-composer"><label>Direction<select value={direction} onChange={e=>setDirection(e.target.value as TransactionDirection)}><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option></select></label><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Amount<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></label><label>Merchant<input value={merchant} onChange={e=>setMerchant(e.target.value)} placeholder="Target"/></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select></label><label>Subcategory<input value={subcategory} onChange={e=>setSubcategory(e.target.value)} placeholder="Action Figures"/></label><label>Account<select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Unassigned</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Portfolio item<select value={itemId} onChange={e=>setItemId(e.target.value)}><option value="">Not linked</option>{items.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="check"><input type="checkbox" checked={hobby} onChange={e=>setHobby(e.target.checked)}/>Hobby-related</label><footer><button onClick={onCancel}>Cancel</button><button className="red" onClick={submit}>Save transaction</button></footer></div>;
}

function BudgetForm({onSave,onCancel}:{onSave:(budget:FinancialBudget)=>void;onCancel:()=>void}){
  const [name,setName]=useState('');
  const [category,setCategory]=useState('Action Figures');
  const [amount,setAmount]=useState('');
  const [period,setPeriod]=useState<FinancialBudget['period']>('monthly');
  const submit=()=>{if(!name.trim()||!amount.trim())return;const now=isoNow();onSave({id:newFinancialId('budget'),name:name.trim(),period,amount:safeNumber(amount),category:category.trim()||undefined,active:true,createdAt:now,updatedAt:now})};
  return <div className="vxf-composer small"><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Action Figures"/></label><label>Category<input value={category} onChange={e=>setCategory(e.target.value)}/></label><label>Period<select value={period} onChange={e=>setPeriod(e.target.value as FinancialBudget['period'])}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="annual">Annual</option><option value="custom">Custom</option></select></label><label>Amount<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/></label><footer><button onClick={onCancel}>Cancel</button><button className="red" onClick={submit}>Save budget</button></footer></div>;
}

function BillForm({accounts,onSave,onCancel}:{accounts:FinancialAccount[];onSave:(bill:FinancialBill)=>void;onCancel:()=>void}){
  const [name,setName]=useState('');
  const [amount,setAmount]=useState('');
  const [date,setDate]=useState('');
  const [category,setCategory]=useState('Utilities');
  const [frequency,setFrequency]=useState<FinancialBill['frequency']>('monthly');
  const [accountId,setAccountId]=useState('');
  const [autopay,setAutopay]=useState(false);
  const submit=()=>{if(!name.trim()||!amount.trim())return;const now=isoNow();onSave({id:newFinancialId('bill'),name:name.trim(),amount:safeNumber(amount),nextDueDate:date||undefined,dueDay:date?new Date(date+'T12:00:00').getDate():undefined,frequency,category,autopay,accountId:accountId||undefined,active:true,createdAt:now,updatedAt:now})};
  return <div className="vxf-composer"><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Internet"/></label><label>Amount<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Next due<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select></label><label>Frequency<select value={frequency} onChange={e=>setFrequency(e.target.value as FinancialBill['frequency'])}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option><option value="custom">Custom</option></select></label><label>Account<select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Unassigned</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label className="check"><input type="checkbox" checked={autopay} onChange={e=>setAutopay(e.target.checked)}/>Autopay</label><footer><button onClick={onCancel}>Cancel</button><button className="red" onClick={submit}>Save bill</button></footer></div>;
}

function GoalForm({onSave,onCancel}:{onSave:(goal:FinancialGoal)=>void;onCancel:()=>void}){
  const [name,setName]=useState('');
  const [type,setType]=useState<FinancialGoal['type']>('custom');
  const [target,setTarget]=useState('');
  const [current,setCurrent]=useState('');
  const [date,setDate]=useState('');
  const submit=()=>{if(!name.trim()||!target.trim())return;const now=isoNow();onSave({id:newFinancialId('goal'),name:name.trim(),type,targetAmount:safeNumber(target),currentAmount:safeNumber(current),targetDate:date||undefined,status:'active',createdAt:now,updatedAt:now})};
  return <div className="vxf-composer small"><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Emergency Fund"/></label><label>Type<select value={type} onChange={e=>setType(e.target.value as FinancialGoal['type'])}>{GOAL_TYPES.map(x=><option key={x} value={x}>{x.replace('_',' ')}</option>)}</select></label><label>Target<input inputMode="decimal" value={target} onChange={e=>setTarget(e.target.value)}/></label><label>Saved<input inputMode="decimal" value={current} onChange={e=>setCurrent(e.target.value)}/></label><label>Target date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><footer><button onClick={onCancel}>Cancel</button><button className="red" onClick={submit}>Save goal</button></footer></div>;
}

function DebtCard({account,extra}:{account:FinancialAccount;extra:number}){
  const balance=account.currentBalance;
  const apr=account.apr||0;
  const minimum=account.minimumPayment||0;
  const utilization=account.creditLimit?pct(balance,account.creditLimit):undefined;
  const monthlyRate=apr/100/12;
  const payment=Math.max(0,minimum+extra);
  let months:number|undefined;
  if(balance===0)months=0;
  else if(payment>0){
    if(monthlyRate===0)months=Math.ceil(balance/payment);
    else if(payment>balance*monthlyRate){
      months=Math.ceil(-Math.log(1-balance*monthlyRate/payment)/Math.log(1+monthlyRate));
    }
  }
  return <article className="vxf-debt-card"><header><span><CreditCard/></span><div><strong>{account.name}</strong><small>{ACCOUNT_LABELS[account.type]} · {account.institution||'Manual account'}</small></div></header><div className="vxf-debt-numbers"><div><span>Balance</span><b>{exactMoney(balance)}</b></div><div><span>APR</span><b>{account.apr!==undefined?account.apr.toFixed(2)+'%':'Not set'}</b></div><div><span>Minimum</span><b>{account.minimumPayment!==undefined?exactMoney(account.minimumPayment):'Not set'}</b></div>{utilization!==undefined?<div><span>Utilization</span><b>{utilization}%</b></div>:null}</div>{utilization!==undefined?<div className="vxf-progress"><i style={{width:utilization+'%'}}/></div>:null}<footer><span>Scenario with +{exactMoney(extra)}/mo</span><strong>{months===undefined?'Needs minimum/APR data':months===0?'Paid off':months+' estimated months'}</strong></footer></article>;
}
