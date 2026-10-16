import { describe, expect, it } from "vitest";
import Link from "next/link";
import { Button, ButtonLink } from "./button";
import { Badge, StatusBadge } from "./badge";
import { Surface } from "./surface";
import { Callout } from "./callout";
import { EmptyState, Empty } from "./empty";
import { PageHeader } from "./page-header";
import { Money, Price } from "./money";
import { Stat, StatStrip, MetricList, MetricRow } from "./stat";
import { Progress } from "./progress";
import { Avatar } from "./avatar";
import { AvatarImage } from "./avatar-image";
import { Skeleton, SkeletonText, SkeletonAvatar } from "./skeleton";
import { Table, Th, Tr, Td, MoneyCell, DateCell, RowActions, EmptyRow } from "./table";
import { IconPlus } from "../icons";
import { functionProps } from "../../test/rsc-safe";

// Client components are listed so the walk checks only the props that cross into them.
const boundaries = [Link, AvatarImage];
const fnProps = (node: Parameters<typeof functionProps>[0]) => functionProps(node, boundaries);

describe("functionProps (the checker itself)", () => {
  it("finds a handler on a host element, through nested function components and arrays", () => {
    const Inner = () => <button onClick={() => {}}>x</button>;
    const Outer = () => <div>{[<Inner key="a" />]}</div>;
    expect(functionProps(<Outer />)).toEqual(["<button>.onClick"]);
  });

  it("finds a function passed to a client boundary, and ignores children and undefined handlers", () => {
    expect(fnProps(<Link href="/x" onNavigate={() => {}}>go</Link>)).toEqual(["<Client>.onNavigate"]);
    expect(fnProps(<button onClick={undefined}>{"text"}</button>)).toEqual([]);
  });

  it("treats a component that needs hooks as a boundary instead of crashing", () => {
    const NeedsHooks = (props: { onPick: () => void }) => {
      void props;
      throw new Error("Invalid hook call");
    };
    expect(functionProps(<NeedsHooks onPick={() => {}} />)).toEqual(["<NeedsHooks>.onPick"]);
  });
});

// A server component may render each of these directly, so none may leave a function prop in the tree.
describe("server-renderable primitives carry no function props", () => {
  const cases: Record<string, () => Parameters<typeof functionProps>[0]> = {
    "Button (plain)": () => <Button>Apply</Button>,
    "Button (submit, variant, size, icon, className)": () => <Button type="submit" variant="secondary" size="lg" icon={<IconPlus />} className="w-full">Apply</Button>,
    "ButtonLink": () => <ButtonLink href="/x" variant="secondary" icon={<IconPlus />}>Go</ButtonLink>,
    "Badge": () => <Badge tone="good" dot>Live</Badge>,
    "StatusBadge": () => <StatusBadge status="paid" />,
    "Surface": () => <Surface as="section" tone="interactive" padding="lg">x</Surface>,
    "Callout": () => <Callout tone="bad" action={<ButtonLink href="/x">Fix</ButtonLink>}>Nope</Callout>,
    "EmptyState (link actions)": () => <EmptyState title="Nothing" body="b" action={{ label: "Add", href: "/a" }} secondaryAction={{ label: "Docs", href: "/d" }} />,
    "EmptyState (no action)": () => <EmptyState title="Nothing" inline />,
    "Empty": () => <Empty title="Nothing" body="b" cta={{ label: "Add", href: "/a" }} />,
    "PageHeader": () => <PageHeader title="T" sub="s" back={{ label: "Back", href: "/" }} meta={<Badge>m</Badge>} actions={<ButtonLink href="/n">New</ButtonLink>} />,
    "Money / Price": () => <><Money paise={12345} sign="−" tone="good" free /><Price paise={50000} period="month" gstNote="incl. GST" /></>,
    "Stat / StatStrip": () => <><Stat label="Net" value="1" delta="-3%" /><StatStrip items={[{ label: "a", value: "1" }, { label: "b", value: "2" }]} /></>,
    "MetricList / MetricRow": () => <MetricList><MetricRow label="Total" value={<Money paise={100} />} sub="s" strong /></MetricList>,
    "Progress": () => <Progress value={3} max={8} label="Completion" />,
    "Avatar": () => <Avatar name="Asha" src="/a.png" />,
    "Skeleton family": () => <><Skeleton width={10} height={10} /><SkeletonText lines={2} /><SkeletonAvatar /></>,
    "Table and every cell": () => (
      <Table caption="Orders" stack stickyHeader>
        <thead><tr><Th>Order</Th><Th align="right">Amount</Th></tr></thead>
        <tbody>
          <Tr><Td label="Order">#1</Td><MoneyCell paise={100} label="Amount" /><DateCell date={new Date(0)} /><RowActions><ButtonLink href="/o/1" variant="ghost">View</ButtonLink></RowActions></Tr>
          <EmptyRow colSpan={4} title="Nothing" action={<ButtonLink href="/x">Add</ButtonLink>} />
        </tbody>
      </Table>
    ),
  };

  it.each(Object.keys(cases))("%s", (name) => {
    expect(fnProps(cases[name]())).toEqual([]);
  });
});

describe("Button's loading guard still works where it is needed", () => {
  it("attaches a handler only when loading or when the caller passes onClick", () => {
    expect(fnProps(<Button>Plain</Button>)).toEqual([]);
    expect(fnProps(<Button loading>Busy</Button>)).toEqual(["<button>.onClick"]);
    expect(fnProps(<Button onClick={() => {}}>Click</Button>)).toEqual(["<button>.onClick"]);
  });
});
