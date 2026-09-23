import {NextResponse} from 'next/server';
import {disconnectPlaidItem,loadPlaidSnapshot,requirePlaidUser,routeError} from '../../../../lib/plaidServer';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export async function POST(req:Request){try{const auth=await requirePlaidUser(req,true);const body=await req.json();const itemId=String(body.itemId||'');if(!itemId)return NextResponse.json({error:'Item ID is required.',code:'ITEM_ID_REQUIRED'},{status:400});await disconnectPlaidItem(auth.userId,itemId);return NextResponse.json(await loadPlaidSnapshot(auth.userId),{headers:{'Cache-Control':'no-store'}})}catch(error){const e=routeError(error);return NextResponse.json(e.body,{status:e.status})}}
