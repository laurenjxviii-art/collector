import {NextResponse} from 'next/server';
import {plaidCredentialHealth} from '../../../../lib/plaidServer';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){const health=await plaidCredentialHealth();return NextResponse.json(health,{headers:{'Cache-Control':'no-store'}})}
