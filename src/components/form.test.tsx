import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Checkbox,
  ColorField,
  Field,
  Input,
  InputGroup,
  RadioCard,
  CheckboxCard,
  Select,
  SubmitButton,
  Switch,
  Textarea,
  colorFromPicker,
  colorFromText,
  isHexColor,
  legacyButtonLook,
} from "./form";

const render = renderToStaticMarkup;

/** Pull an attribute value off the first element matching `tag` in the markup. */
function attr(html: string, tag: string, name: string): string | undefined {
  const el = html.match(new RegExp(`<${tag}\\b[^>]*>`))?.[0] ?? "";
  return el.match(new RegExp(`\\s${name}="([^"]*)"`, "i"))?.[1];
}

describe("Input", () => {
  it("wires label for= to the input id", () => {
    const html = render(<Input id="email" name="email" label="Email" />);
    expect(html).toContain('<label for="email" class="label">Email</label>');
    expect(attr(html, "input", "id")).toBe("email");
    expect(attr(html, "input", "name")).toBe("email");
    expect(attr(html, "input", "class")).toBe("input");
  });

  it("generates a unique id when none is given and links it to the label", () => {
    const html = render(<Input name="email" label="Email" />);
    const id = attr(html, "input", "id");
    expect(id).toBeTruthy();
    expect(attr(html, "label", "for")).toBe(id);
  });

  it("has no aria-invalid or aria-describedby when clean", () => {
    const html = render(<Input name="a" label="A" />);
    expect(html).not.toContain("aria-invalid");
    expect(html).not.toContain("aria-describedby");
    expect(html).not.toContain('role="alert"');
  });

  it("renders helper text below the input and describes the input with it", () => {
    const html = render(<Input id="pw" name="pw" label="Password" hint="At least 8 characters." />);
    expect(html).toContain('<p id="pw-hint" class="hint">At least 8 characters.</p>');
    expect(attr(html, "input", "aria-describedby")).toBe("pw-hint");
    expect(html.indexOf("<input")).toBeLessThan(html.indexOf("pw-hint"));
    expect(html.indexOf("<label")).toBeLessThan(html.indexOf("<input"));
  });

  it("renders an error with role=alert, aria-invalid and an id linked by aria-describedby", () => {
    const html = render(<Input id="pw" name="pw" label="Password" hint="Hint" error="Too short." />);
    expect(html).toContain('<p id="pw-err" role="alert" class="err">Too short.</p>');
    expect(attr(html, "input", "aria-invalid")).toBe("true");
    expect(attr(html, "input", "aria-describedby")).toBe("pw-err");
    // the error replaces the hint rather than stacking two lines
    expect(html).not.toContain("pw-hint");
  });

  it("passes native attributes through and puts className on the wrapper", () => {
    const html = render(
      <Input id="e" name="e" label="E" type="email" required placeholder="you@example.com" autoComplete="email" className="max-w-sm" />,
    );
    expect(html).toMatch(/^<div class="max-w-sm">/);
    expect(attr(html, "input", "type")).toBe("email");
    expect(html).toMatch(/<input[^>]*\srequired/);
    expect(attr(html, "input", "placeholder")).toBe("you@example.com");
    expect(attr(html, "input", "autocomplete")).toBe("email");
  });
});

describe("field a11y merging", () => {
  it("keeps a caller's aria-invalid when the field has no error of its own", () => {
    const html = render(<Input label="Email" aria-invalid name="email" />);
    expect(attr(html, "input", "aria-invalid")).toBe("true");
  });

  it("accepts the string form of aria-invalid", () => {
    const html = render(<Input label="Email" aria-invalid="true" name="email" />);
    expect(attr(html, "input", "aria-invalid")).toBe("true");
  });

  it("leaves aria-invalid off when neither the caller nor the field says invalid", () => {
    const html = render(<Input label="Email" name="email" />);
    expect(attr(html, "input", "aria-invalid")).toBeUndefined();
  });

  it("an error still wins and is described by the message", () => {
    const html = render(<Input id="e" label="Email" error="Required." name="email" />);
    expect(attr(html, "input", "aria-invalid")).toBe("true");
    expect(attr(html, "input", "aria-describedby")).toBe("e-err");
  });

  it("merges a caller's aria-describedby ahead of the field's own message id", () => {
    const html = render(<Input id="e" label="Email" hint="Work address." aria-describedby="outside" name="email" />);
    expect(attr(html, "input", "aria-describedby")).toBe("outside e-hint");
  });
});

describe("field a11y merging across every control", () => {
  const controls: [string, string, (p: Record<string, unknown>) => React.ReactElement][] = [
    ["Input", "input", (p) => <Input id="f" name="f" label="L" {...p} />],
    ["Textarea", "textarea", (p) => <Textarea id="f" name="f" label="L" {...p} />],
    ["Select", "select", (p) => <Select id="f" name="f" label="L" {...p}><option>a</option></Select>],
    ["InputGroup", "input", (p) => <InputGroup id="f" name="f" label="L" prefix="x" {...p} />],
    ["Checkbox", "input", (p) => <Checkbox id="f" name="f" label="L" {...p} />],
    ["Switch", "input", (p) => <Switch id="f" name="f" label="L" {...p} />],
  ];

  it.each(controls)("%s honours a caller's aria-invalid without an error", (_n, tag, make) => {
    expect(attr(render(make({ "aria-invalid": true })), tag, "aria-invalid")).toBe("true");
    expect(attr(render(make({ "aria-invalid": "true" })), tag, "aria-invalid")).toBe("true");
    expect(attr(render(make({ "aria-invalid": false })), tag, "aria-invalid")).toBeUndefined();
    expect(attr(render(make({})), tag, "aria-invalid")).toBeUndefined();
  });

  it.each(controls)("%s passes the ARIA token values grammar and spelling through", (_n, tag, make) => {
    expect(attr(render(make({ "aria-invalid": "grammar" })), tag, "aria-invalid")).toBe("grammar");
    expect(attr(render(make({ "aria-invalid": "spelling" })), tag, "aria-invalid")).toBe("spelling");
    expect(attr(render(make({ "aria-invalid": "false" })), tag, "aria-invalid")).toBeUndefined();
  });

  it.each(controls)("%s lets the field's error force aria-invalid over a caller's false", (_n, tag, make) => {
    const html = render(make({ error: "Bad.", "aria-invalid": false }));
    expect(attr(html, tag, "aria-invalid")).toBe("true");
  });

  it.each(controls)("%s joins a caller's aria-describedby with the hint or error id", (_n, tag, make) => {
    expect(attr(render(make({ hint: "H", "aria-describedby": "x" })), tag, "aria-describedby")).toBe("x f-hint");
    expect(attr(render(make({ error: "E", "aria-describedby": "x" })), tag, "aria-describedby")).toBe("x f-err");
    expect(attr(render(make({ "aria-describedby": "x" })), tag, "aria-describedby")).toBe("x");
  });
});

describe("Textarea", () => {
  it("wires label, rows, hint and error like Input", () => {
    const html = render(<Textarea id="bio" name="bio" label="Bio" rows={6} error="Required." />);
    expect(attr(html, "label", "for")).toBe("bio");
    expect(html).toMatch(/^<div><label/);
    expect(attr(html, "textarea", "id")).toBe("bio");
    expect(attr(html, "textarea", "rows")).toBe("6");
    expect(attr(html, "textarea", "class")).toBe("input");
    expect(attr(html, "textarea", "aria-invalid")).toBe("true");
    expect(attr(html, "textarea", "aria-describedby")).toBe("bio-err");
    expect(html).toContain('id="bio-err" role="alert"');
  });

  it("defaults to four rows", () => {
    expect(attr(render(<Textarea id="t" name="t" label="T" />), "textarea", "rows")).toBe("4");
  });
});

describe("Select", () => {
  const options = (
    <>
      <option value="a">A</option>
      <option value="b">B</option>
    </>
  );

  it("keeps a native select with the input look, a custom chevron and no native arrow", () => {
    const html = render(<Select id="role" name="role" label="Role">{options}</Select>);
    expect(attr(html, "label", "for")).toBe("role");
    expect(html).toContain("<select");
    expect(html).toContain('<option value="a">A</option>');
    // `.input` token look with the native arrow stripped, plus the `peer` marker the chevron's peer-disabled needs.
    const tokens = (attr(html, "select", "class") ?? "").split(" ");
    expect(tokens).toEqual(expect.arrayContaining(["peer", "input", "appearance-none"]));
    expect(html).toContain("peer-disabled:opacity-50");
    expect(html).toContain("<svg");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("pointer-events-none");
  });

  it("wires error and aria-invalid on the select", () => {
    const html = render(<Select id="role" name="role" label="Role" error="Pick one.">{options}</Select>);
    expect(attr(html, "select", "aria-invalid")).toBe("true");
    expect(attr(html, "select", "aria-describedby")).toBe("role-err");
    expect(html).toContain('id="role-err" role="alert"');
  });
});

describe("InputGroup", () => {
  it("renders prefix and suffix text inside one bordered group around the input", () => {
    const html = render(<InputGroup id="h" name="handle" label="Handle" prefix="/c/" suffix=".tysonpe.in" />);
    expect(attr(html, "label", "for")).toBe("h");
    expect(html.indexOf("/c/")).toBeLessThan(html.indexOf("<input"));
    expect(html.indexOf("<input")).toBeLessThan(html.indexOf(".tysonpe.in"));
    expect(html).toContain("focus-within:border-ink");
    expect(attr(html, "input", "id")).toBe("h");
  });

  it("omits the addon it was not given", () => {
    const html = render(<InputGroup id="amt" name="amt" label="Amount" prefix="₹" />);
    expect(html).toContain("₹");
    // Count addon spans by their edge border, not by colour: the wrapper also carries has-[:disabled]:bg-surface-2.
    expect(html.match(/<span class="[^"]*\bborder-r border-line(?![-\w])[^"]*">/g)).toHaveLength(1);
    expect(html).not.toMatch(/border-l border-line(?![-\w])/);
  });

  it("marks the group and input invalid and links the error", () => {
    const html = render(<InputGroup id="h" name="handle" label="Handle" prefix="/c/" error="Taken." />);
    expect(attr(html, "input", "aria-invalid")).toBe("true");
    expect(attr(html, "input", "aria-describedby")).toBe("h-err");
    expect(html).toContain("has-[[aria-invalid=true]]:border-bad");
    expect(html).toContain('id="h-err" role="alert"');
  });
});

describe("Checkbox", () => {
  it("wraps the box and label text in a label bound with for=", () => {
    const html = render(<Checkbox id="tos" name="tos" label="I agree to the terms" />);
    expect(html).toContain('<label for="tos"');
    expect(attr(html, "input", "type")).toBe("checkbox");
    expect(attr(html, "input", "id")).toBe("tos");
    expect(html).toContain("I agree to the terms");
    expect(html).not.toContain("aria-invalid");
  });

  it("supports hint and error with aria wiring", () => {
    const html = render(<Checkbox id="tos" name="tos" label="Agree" hint="Required to continue." error="Accept the terms." />);
    expect(attr(html, "input", "aria-invalid")).toBe("true");
    expect(attr(html, "input", "aria-describedby")).toBe("tos-err");
    expect(html).toContain('id="tos-err" role="alert"');
    const withHint = render(<Checkbox id="tos" name="tos" label="Agree" hint="Required to continue." />);
    expect(attr(withHint, "input", "aria-describedby")).toBe("tos-hint");
  });

  it("passes checked state through", () => {
    expect(render(<Checkbox id="c" name="c" label="C" defaultChecked />)).toMatch(/<input[^>]*\schecked/);
  });
});

describe("Switch", () => {
  it("is a native checkbox with role=switch, labelled and peer-styled", () => {
    const html = render(<Switch id="live" name="live" label="Accept payments" defaultChecked />);
    expect(attr(html, "input", "type")).toBe("checkbox");
    expect(attr(html, "input", "role")).toBe("switch");
    expect(attr(html, "input", "class")).toContain("peer");
    expect(attr(html, "input", "class")).toContain("sr-only");
    expect(html).toContain('<label for="live"');
    expect(html).toContain("peer-checked:bg-ink");
    expect(html).toMatch(/<input[^>]*\schecked/);
  });

  it("wires hint and error", () => {
    const html = render(<Switch id="s" name="s" label="S" hint="Takes effect now." error="Could not save." />);
    expect(attr(html, "input", "aria-invalid")).toBe("true");
    expect(attr(html, "input", "aria-describedby")).toBe("s-err");
    expect(html).toContain('id="s-err" role="alert"');
  });
});

describe("RadioCard", () => {
  it("is a native radio under a label, selected state from peer-checked, with title and description", () => {
    const html = render(
      <RadioCard name="role" value="creator" title="Sell my content" description="Storefront and payouts." defaultChecked />,
    );
    expect(html).toMatch(/^<label /);
    expect(attr(html, "input", "type")).toBe("radio");
    expect(attr(html, "input", "name")).toBe("role");
    expect(attr(html, "input", "value")).toBe("creator");
    expect(attr(html, "input", "class")).toContain("peer");
    expect(attr(html, "input", "class")).toContain("sr-only");
    expect(html).toMatch(/<input[^>]*\schecked/);
    expect(html).toContain("peer-checked:border-ink");
    expect(html).toContain("peer-focus-visible:outline");
    expect(html).toContain("Sell my content");
    expect(html).toContain("Storefront and payouts.");
  });

  it("names the radio by the title and describes it by the description", () => {
    const html = render(<RadioCard name="g" value="a" title="Razorpay" description="Overlay checkout" />);
    const input = html.match(/<input\b[^>]*>/)?.[0] ?? "";
    const labelledby = input.match(/aria-labelledby="([^"]*)"/)?.[1];
    const describedby = input.match(/aria-describedby="([^"]*)"/)?.[1];
    expect(html).toContain(`id="${labelledby}"`);
    expect(html).toContain(`id="${describedby}"`);
    expect(html.match(new RegExp(`id="${labelledby}"[^>]*>Razorpay<`))).not.toBeNull();
    expect(html.match(new RegExp(`id="${describedby}"[^>]*>Overlay checkout<`))).not.toBeNull();
  });

  it("renders the trailing slot after the text and children under the description", () => {
    const html = render(
      <RadioCard name="g" value="a" title="Razorpay" trailing={<span>Test mode</span>}>
        <span>Footer note</span>
      </RadioCard>,
    );
    expect(html.indexOf("Razorpay")).toBeLessThan(html.indexOf("Footer note"));
    expect(html.indexOf("Footer note")).toBeLessThan(html.indexOf("Test mode"));
  });

  it("works with neither title nor description and drops the aria links", () => {
    const html = render(<RadioCard name="w" value="1">Paytm wallet</RadioCard>);
    expect(html).toContain("Paytm wallet");
    expect(html).not.toContain("aria-labelledby");
    expect(html).not.toContain("aria-describedby");
  });

  it("passes disabled through and dims the card, and merges className on the label", () => {
    const html = render(<RadioCard name="g" value="a" title="T" disabled className="col-span-2" />);
    expect(html).toMatch(/<input[^>]*\sdisabled/);
    expect(html).toContain("peer-disabled:opacity-50");
    expect(html).toMatch(/^<label class="[^"]*col-span-2/);
  });
});

describe("CheckboxCard", () => {
  it("is a native checkbox under a label, with the selected look drawn from peer-checked, title and description", () => {
    const html = render(<CheckboxCard name="a" value="1" title="Cash" description="An asset." defaultChecked />);
    expect(html).toMatch(/^<label /);
    expect(attr(html, "input", "type")).toBe("checkbox");
    expect(attr(html, "input", "name")).toBe("a");
    expect(attr(html, "input", "value")).toBe("1");
    expect(attr(html, "input", "class")).toContain("peer");
    expect(attr(html, "input", "class")).toContain("sr-only");
    expect(html).toMatch(/<input[^>]*\schecked/);
    expect(html).toContain("peer-checked:border-ink");
    expect(html).toContain("peer-checked:bg-ink");
    expect(html).toContain("peer-focus-visible:outline");
    expect(html).toContain("Cash");
    expect(html).toContain("An asset.");
  });

  it("draws a check icon (not a glyph) that only shows when checked", () => {
    const html = render(<CheckboxCard name="a" value="1" title="Cash" />);
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*class="[^"]*opacity-0[^"]*peer-checked:opacity-100/);
    expect(html).not.toMatch(/[\u2713\u2714]/);
  });

  it("is not checked unless asked", () => {
    expect(render(<CheckboxCard name="a" value="1" title="Cash" />)).not.toMatch(/<input[^>]*\schecked/);
    expect(render(<CheckboxCard name="a" value="1" title="Cash" checked onChange={() => {}} />)).toMatch(/<input[^>]*\schecked/);
  });

  it("names the checkbox by the title and describes it by the description", () => {
    const html = render(<CheckboxCard name="g" value="a" title="Debtors" description="Owed to you" />);
    const input = html.match(/<input\b[^>]*>/)?.[0] ?? "";
    const labelledby = input.match(/aria-labelledby="([^"]*)"/)?.[1];
    const describedby = input.match(/aria-describedby="([^"]*)"/)?.[1];
    expect(html.match(new RegExp(`id="${labelledby}"[^>]*>Debtors<`))).not.toBeNull();
    expect(html.match(new RegExp(`id="${describedby}"[^>]*>Owed to you<`))).not.toBeNull();
  });

  it("renders trailing after the text, drops the aria links with no title or description, and keeps the touch floor", () => {
    const html = render(<CheckboxCard name="g" value="a" title="Cash" trailing={<span>Asset</span>} />);
    expect(html.indexOf("Cash")).toBeLessThan(html.indexOf("Asset"));
    expect(html).toContain("pointer-coarse:min-h-11");
    const bare = render(<CheckboxCard name="w" value="1">Plain</CheckboxCard>);
    expect(bare).not.toContain("aria-labelledby");
    expect(bare).not.toContain("aria-describedby");
  });

  it("passes disabled through, dims the card, and merges className on the label", () => {
    const html = render(<CheckboxCard name="g" value="a" title="T" disabled className="col-span-2" />);
    expect(html).toMatch(/<input[^>]*\sdisabled/);
    // the card body and the check box each dim: two spans, so one surviving class cannot satisfy this
    expect(html.match(/peer-disabled:opacity-50/g)).toHaveLength(2);
    expect(html).toContain("peer-disabled:cursor-not-allowed");
    expect(html).toMatch(/^<label class="[^"]*col-span-2/);
  });

  it("uses explicit transition properties and no hover motion", () => {
    const html = render(<CheckboxCard name="g" value="a" title="T" />);
    expect(html).toContain("transition-colors");
    expect(html).not.toMatch(/\btransition(?![-\w])/);
    expect(html).not.toContain("scale");
    expect(html).not.toContain("translate");
  });
});

describe("ColorField", () => {
  it("pairs a native colour input with a hex text input that carries the name", () => {
    const html = render(<ColorField id="brand" name="brandColor" label="Brand colour" defaultValue="#5B3DF5" />);
    expect(attr(html, "label", "for")).toBe("brand");
    expect(html).toContain('type="color"');
    expect(html).toContain('value="#5b3df5"');
    const text = html.match(/<input\b[^>]*type="text"[^>]*>/)?.[0] ?? "";
    expect(text).toContain('id="brand"');
    expect(text).toContain('name="brandColor"');
    expect(text).toContain('value="#5B3DF5"');
    // only the text input submits; the picker has no name
    const picker = html.match(/<input\b[^>]*type="color"[^>]*>/)?.[0] ?? "";
    expect(picker).not.toContain("name=");
    expect(picker).toContain("aria-label=");
  });

  it("lowercases the picker value from an uppercase default while the text keeps the caller's casing", () => {
    const html = render(<ColorField id="b" name="b" label="B" defaultValue="#5B3DF5" />);
    const picker = html.match(/<input\b[^>]*type="color"[^>]*>/)?.[0] ?? "";
    expect(picker).toContain('value="#5b3df5"');
    const text = html.match(/<input\b[^>]*type="text"[^>]*>/)?.[0] ?? "";
    expect(text).toContain('value="#5B3DF5"');
  });

  it("falls back to a valid picker value for a non-hex default", () => {
    const html = render(<ColorField id="c" name="c" label="C" defaultValue="red" />);
    expect(html).toMatch(/type="color"[^>]*value="#000000"|value="#000000"[^>]*type="color"/);
  });

  it("wires hint and error onto the hex input", () => {
    const html = render(<ColorField id="c" name="c" label="C" defaultValue="#16130f" error="Use a 6 digit hex." />);
    const text = html.match(/<input\b[^>]*type="text"[^>]*>/)?.[0] ?? "";
    expect(text).toContain('aria-invalid="true"');
    expect(text).toContain('aria-describedby="c-err"');
    expect(html).toContain('id="c-err" role="alert"');
  });
});

describe("isHexColor", () => {
  it("accepts only #rrggbb", () => {
    expect(isHexColor("#16130f")).toBe(true);
    expect(isHexColor("#ABCDEF")).toBe(true);
    expect(isHexColor("#abc")).toBe(false);
    expect(isHexColor("16130f")).toBe(false);
    expect(isHexColor("#16130g")).toBe(false);
    expect(isHexColor("")).toBe(false);
  });
});

describe("legacyButtonLook", () => {
  it("reads variant and size from old btn class strings and keeps the remainder", () => {
    expect(legacyButtonLook("btn btn-primary")).toEqual({ variant: "primary", size: "md", className: undefined });
    expect(legacyButtonLook("btn btn-secondary btn-sm")).toEqual({ variant: "secondary", size: "sm", className: undefined });
    expect(legacyButtonLook("btn btn-primary btn-lg w-full")).toEqual({ variant: "primary", size: "lg", className: "w-full" });
    expect(legacyButtonLook("btn btn-primary w-full active:scale-[0.98]")).toEqual({
      variant: "primary",
      size: "md",
      className: "w-full active:scale-[0.98]",
    });
    expect(legacyButtonLook("btn btn-danger")).toMatchObject({ variant: "danger" });
    expect(legacyButtonLook("btn btn-ghost")).toMatchObject({ variant: "ghost" });
  });
});

describe("SubmitButton", () => {
  it("renders the Button primitive as a submit button with the default primary look", () => {
    const html = render(<SubmitButton>Save changes</SubmitButton>);
    // The status region precedes the button (it must stay the last child); the button is the markup's tail.
    expect(html).toMatch(/<button [^>]*>[\s\S]*<\/button>$/);
    expect(html).toContain('type="submit"');
    expect(html).toContain('class="btn btn-primary"');
    expect(html).toContain("Save changes");
    expect(html).not.toContain("aria-busy");
  });

  it("keeps working with the legacy className call sites without duplicating btn classes", () => {
    const sm = render(<SubmitButton className="btn btn-secondary btn-sm">Add</SubmitButton>);
    expect(sm).toContain('class="btn btn-secondary btn-sm"');
    const wide = render(<SubmitButton className="btn btn-primary btn-lg w-full" pendingText="Creating order…">Pay</SubmitButton>);
    expect(wide).toContain('class="btn btn-primary btn-lg w-full"');
  });

  it("accepts variant and size props directly", () => {
    const html = render(<SubmitButton variant="secondary" size="sm" className="w-full">Go</SubmitButton>);
    expect(html).toContain('class="btn btn-secondary btn-sm w-full"');
  });
});

describe("Field (context-free usage)", () => {
  it("still renders label, input, hint and the same call-site props", () => {
    const html = render(<Field name="email" label="Email" type="email" autoComplete="email" hint="We never share it." required />);
    const id = attr(html, "input", "id");
    expect(id).toMatch(/-email$/);
    expect(attr(html, "label", "for")).toBe(id);
    expect(attr(html, "input", "name")).toBe("email");
    expect(attr(html, "input", "aria-describedby")).toBe(`${id}-hint`);
    expect(html).toContain("We never share it.");
  });

  it("renders a prefix as an input group addon", () => {
    const html = render(<Field name="handle" label="Store handle" prefix="/c/" />);
    expect(html).toContain("/c/");
    expect(html).toContain("focus-within:border-ink");
  });

  it("renders textarea and select variants", () => {
    expect(render(<Field name="bio" label="Bio" as="textarea" rows={3} />)).toContain('rows="3"');
    const sel = render(<Field name="g" label="G" as="select"><option value="x">X</option></Field>);
    expect(sel).toContain("<select");
    expect(sel).toContain("<svg");
  });

  it("applies defaultValue", () => {
    expect(render(<Field name="n" label="N" defaultValue="Asha" />)).toContain('value="Asha"');
  });
});

describe("ColorField casing helpers", () => {
  it("typing a full uppercase hex keeps the user's casing in the box but emits lowercase", () => {
    expect(colorFromText("#ABCDEF")).toStrictEqual({ text: "#ABCDEF", picker: "#abcdef", emit: "#abcdef" });
  });

  it("does not move the picker or emit while the typed value is not yet a full hex colour", () => {
    expect(colorFromText("#ABC")).toStrictEqual({ text: "#ABC" });
    expect(colorFromText("")).toStrictEqual({ text: "" });
    expect(colorFromText("#ABCDEFG")).toStrictEqual({ text: "#ABCDEFG" });
  });

  it("an uppercase value from the native picker is lowercased everywhere, box included", () => {
    expect(colorFromPicker("#5B3DF5")).toStrictEqual({ text: "#5b3df5", picker: "#5b3df5", emit: "#5b3df5" });
  });
});
