import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const SCAN_DIRS = ["components", "hooks", "pages"];
const TEXT_PATTERN = /[A-Za-z][A-Za-z\s.,!?;:'"()[\]&/-]{2,}/;
const TOAST_METHODS = new Set([
  "error",
  "info",
  "message",
  "success",
  "warning",
]);
const TRANSLATABLE_ATTRIBUTES = new Set([
  "alt",
  "aria-label",
  "placeholder",
  "title",
]);

const ignoredDirectories = new Set([
  ".git",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const violations = [];

const readFiles = (dir) => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...readFiles(fullPath));
      continue;
    }

    if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }

  return files;
};

const isMeaningfulEnglish = (value) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  return TEXT_PATTERN.test(normalized) ? normalized : "";
};

const addViolation = (sourceFile, node, message, value) => {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile)
  );
  violations.push({
    file: path.relative(ROOT, sourceFile.fileName),
    line: line + 1,
    column: character + 1,
    message,
    value,
  });
};

const isTCall = (node) =>
  ts.isCallExpression(node) &&
  ts.isIdentifier(node.expression) &&
  node.expression.text === "t";

const isInsideJsxAttribute = (node) => {
  let current = node.parent;
  while (current) {
    if (ts.isJsxAttribute(current)) {
      return true;
    }

    if (ts.isJsxElement(current) || ts.isJsxFragment(current)) {
      return false;
    }

    current = current.parent;
  }

  return false;
};

const isToastCall = (node) => {
  if (!ts.isCallExpression(node)) {
    return false;
  }

  const expression = node.expression;
  if (ts.isIdentifier(expression)) {
    return expression.text === "toast";
  }

  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "toast" &&
    TOAST_METHODS.has(expression.name.text)
  );
};

const getJsxAttributeName = (node) =>
  ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)
    ? node.name.text
    : "";

const isLiteral = (node) =>
  ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);

const isTranslatableToastArgument = (node) => {
  let found = false;

  const visit = (current) => {
    if (found || isTCall(current)) {
      return;
    }

    if (isLiteral(current) && isMeaningfulEnglish(current.text)) {
      found = true;
      return;
    }

    if (ts.isTemplateExpression(current)) {
      if (isMeaningfulEnglish(current.head.text)) {
        found = true;
        return;
      }

      for (const span of current.templateSpans) {
        if (isMeaningfulEnglish(span.literal.text)) {
          found = true;
          return;
        }
      }
    }

    ts.forEachChild(current, visit);
  };

  visit(node);
  return found;
};

const checkJsxExpressionLiteral = (sourceFile, node) => {
  if (isInsideJsxAttribute(node)) {
    return;
  }

  const expression = node.expression;
  if (!expression || isTCall(expression)) {
    return;
  }

  if (isLiteral(expression)) {
    const value = isMeaningfulEnglish(expression.text);
    if (value) {
      addViolation(sourceFile, expression, "JSX text must use t(...).", value);
    }
    return;
  }

  if (ts.isConditionalExpression(expression)) {
    for (const branch of [expression.whenTrue, expression.whenFalse]) {
      if (isLiteral(branch)) {
        const value = isMeaningfulEnglish(branch.text);
        if (value) {
          addViolation(sourceFile, branch, "JSX text must use t(...).", value);
        }
      }
    }
  }
};

const checkJsxAttribute = (sourceFile, node) => {
  const name = getJsxAttributeName(node);
  if (!TRANSLATABLE_ATTRIBUTES.has(name) || !node.initializer) {
    return;
  }

  if (ts.isStringLiteral(node.initializer)) {
    const value = isMeaningfulEnglish(node.initializer.text);
    if (value) {
      addViolation(
        sourceFile,
        node.initializer,
        `JSX ${name} must use t(...).`,
        value
      );
    }
    return;
  }

  if (
    ts.isJsxExpression(node.initializer) &&
    node.initializer.expression &&
    !isTCall(node.initializer.expression)
  ) {
    checkJsxExpressionLiteral(sourceFile, node.initializer);
  }
};

const checkTDefaultValue = (sourceFile, node) => {
  if (!isTCall(node) || node.arguments.length < 2) {
    return;
  }

  const options = node.arguments[1];
  if (!ts.isObjectLiteralExpression(options)) {
    return;
  }

  for (const property of options.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }

    const key =
      ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
        ? property.name.text
        : "";
    if (key !== "defaultValue") {
      continue;
    }

    const initializer = property.initializer;
    if (isLiteral(initializer)) {
      const value = isMeaningfulEnglish(initializer.text);
      if (value) {
        addViolation(
          sourceFile,
          initializer,
          "Translation calls must not include English defaultValue.",
          value
        );
      }
    }
  }
};

const checkFile = (file) => {
  const source = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") || file.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS
  );

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      const value = isMeaningfulEnglish(node.getText(sourceFile));
      if (value) {
        addViolation(sourceFile, node, "JSX text must use t(...).", value);
      }
    }

    if (ts.isJsxExpression(node)) {
      checkJsxExpressionLiteral(sourceFile, node);
    }

    if (ts.isJsxAttribute(node)) {
      checkJsxAttribute(sourceFile, node);
    }

    if (isTCall(node)) {
      checkTDefaultValue(sourceFile, node);
    }

    if (isToastCall(node)) {
      const [firstArg] = node.arguments;
      if (firstArg && isTranslatableToastArgument(firstArg)) {
        addViolation(
          sourceFile,
          firstArg,
          "Toast text must use t(...).",
          firstArg.getText(sourceFile)
        );
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
};

for (const dir of SCAN_DIRS) {
  for (const file of readFiles(path.join(ROOT, dir))) {
    checkFile(file);
  }
}

if (violations.length > 0) {
  console.error("Zero-English UI guard failed:");
  for (const violation of violations) {
    console.error(
      `${violation.file}:${violation.line}:${violation.column} ${violation.message} ${violation.value}`
    );
  }
  process.exit(1);
}

console.log("Zero-English UI guard passed.");
