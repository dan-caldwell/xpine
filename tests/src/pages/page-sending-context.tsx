import { setContext } from 'xpine';

await setContext('sidebar', (context) => {
  return [
    ...context,
    {
      color: 'blue',
      number: 123,
    }
  ];
});

export default async function Component() {
  return (
    <div>Page sending context</div>
  )
}