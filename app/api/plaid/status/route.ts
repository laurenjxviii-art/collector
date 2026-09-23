import {NextResponse} from 'next/server';
import {loadPlaidSnapshot,requirePlaidUser,routeError} from '../../../../lib/plaidServer';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:Request){try{const auth=await requirePlaidUser(req,true);return NextResponse.json(await loadPlaidSnapshot(auth.userId),{headers:{'Cache-Control':'no-store'}})}catch(error){const e=routeError(error);return NextResponse.json(e.body,{status:e.status})}}
