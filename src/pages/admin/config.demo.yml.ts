import { readFile } from 'node:fs/promises';

export const GET = async () => {
  const source = await readFile(
    new URL('../../../public/admin/config.yml', import.meta.url),
    'utf8',
  );

  const demo = source.replace(
    /^backend:\n(?:[ \t]+\S.*\n)+/m,
    'backend:\n  name: test-repo\n',
  );

  return new Response(demo, {
    headers: { 'content-type': 'text/yaml; charset=utf-8' },
  });
};
