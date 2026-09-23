import {NextResponse} from 'next/server';
import {processPlaidWebhook,routeError,verifyPlaidWebhook} from '../../../../lib/plaidServer';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export async function POST(req:Request){try{const raw=await req.text();await verifyPlaidWebhook(raw,req.headers.get('plaid-verification')||'');const payload=JSON.parse(raw);const result=await processPlaidWebhook(payload);return NextResponse.json({ok:true,...result})}catch(error){const e=routeError(error);return NextResponse.json(e.body,{status:e.status})}}
