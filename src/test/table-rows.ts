/**
 * The opening tag of every row inside a <thead> in rendered HTML, in document order. The Table primitive pins explicit ARIA
 * roles (role="table", "columnheader", "cell") because WebKit drops table semantics from rows laid out as blocks in stack
 * mode; a header row without role="row" leaves its columnheaders with no row parent. Page tests assert on this list.
 */
export function headRowTags(html: string): string[] {
  const tags: string[] = [];
  for (const head of html.matchAll(/<thead\b[^>]*>([\s\S]*?)<\/thead>/g)) {
    for (const row of head[1].matchAll(/<tr\b[^>]*>/g)) tags.push(row[0]);
  }
  return tags;
}
