import type {ComponentType} from 'react';
import PixelPerfectExperience from './PixelPerfectExperience';

export default function PixelPerfectScreen({Component}:{Component:ComponentType}){
  return <PixelPerfectExperience><Component/></PixelPerfectExperience>;
}
