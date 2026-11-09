import { Redirect } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';

import { DISCLAIMER_KEY } from '../src/data/settings';

export default function Index() {
  return <Redirect href={Storage.getItemSync(DISCLAIMER_KEY) ? '/hoy' : '/aviso'} />;
}
