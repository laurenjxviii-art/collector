import {NextResponse} from 'next/server';
import {createPlaidLinkToken,requirePlaidUser,routeError} from '../../../../lib/plaidServer';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export async function POST(req:Request){try{const auth=await requirePlaidUser(req,true);const body=await req.json().catch(()=>({}));const itemId=typeof body.itemId==='string'&&body.itemId?body.itemId:undefined;return NextResponse.json(await createPlaidLinkToken(req,auth.userId,itemId),{headers:{'Cache-Control':'no-store'}})}catch(error){const e=routeError(error);return NextResponse.json(e.body,{status:e.status})}}
