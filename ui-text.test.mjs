import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";

// Explicit whitespace is also a native text node, even though a web build accepts it.
function textOutsideText(source, filename = "fixture.tsx") {
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const errors = [];
  function visit(node, inText = false) {
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      const inside = ts.isJsxElement(node)
        ? node.openingElement.tagName.getText(file) === "Text"
        : inText;
      for (const child of node.children) {
        const literal = ts.isJsxText(child)
          ? child.text.trim()
          : ts.isJsxExpression(child) &&
              child.expression &&
              ts.isStringLiteral(child.expression)
            ? child.expression.text
            : "";
        if (!inside && literal.length > 0) {
          errors.push(
            file.getLineAndCharacterOfPosition(child.getStart(file)).line + 1,
          );
        }
        visit(child, inside);
      }
      return;
    }
    ts.forEachChild(node, (child) => visit(child, inText));
  }
  visit(file);
  return errors;
}

test("Native Textprüfung erkennt auch freistehende Leerzeichen", () => {
  assert.equal(
    textOutsideText('<View><>{" "}<Text>OK</Text></></View>').length,
    1,
  );
  assert.deepEqual(
    textOutsideText('<View><Text>Hallo{" "}Welt</Text></View>'),
    [],
  );
});

test("App-Komponenten enthalten keinen direkten Text außerhalb von Text", () => {
  for (const filename of readdirSync(new URL(".", import.meta.url)).filter(
    (name) => name.endsWith(".tsx"),
  )) {
    assert.deepEqual(
      textOutsideText(
        readFileSync(new URL(filename, import.meta.url), "utf8"),
        filename,
      ),
      [],
      filename,
    );
  }
});
