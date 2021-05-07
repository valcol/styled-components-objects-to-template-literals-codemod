//jscodeshift -t codemod.js styles.js -d -p
import chalk from "chalk";

const camelCaseToDash = (str = "") => {
    return str.replace(/([a-zA-Z])(?=[A-Z])/g, "$1-").toLowerCase();
};

const simpleNumberReplacementProps = [
    /^border(top|bottom)(right|left)radius$/,
    /^borderradius$/,
    /^border(top|right|bottom|left|horizontal|vertical)?width$/,
    /^border$/,
    /^(margin|padding)(top|right|bottom|left|horizontal|vertical)?$/,
    /^(top|right|left|bottom)$/,
    /^(min|max)?(width|height)$/,
    /^flexbasis$/,
    /^font(size)?$/,
    /^lineheight$/,
];

const isSimpleNumberReplacement = (testProp) =>
    simpleNumberReplacementProps.some((re) => re.test(testProp));

const replaceSimpleNumbers = (value) =>
    `${value}`.replace(
        /([+-]?(?:\d*\.)?\d+(?:[Ee][+-]?\d+)?)(?!\d|\.|cm|mm|Q|in|pc|pt|px|em|ex|ch|rem|lh|vw|vh|vmin|vmax|%)/g,
        "$1px"
    );

const customFixers = {
    flex: (value) => value.replace(/((?:[\d.]+\s+){2}[\d.])$/, "$1px"),
    font: (value) =>
        value.replace(
            /^(.*[\d.]+px\s?(?:\/\s*[\d.]+px\s*)?)([^"]*?)\s*$/,
            (match, p1, p2) => `${p1}${JSON.stringify(p2)}`
        ),
    fontfamily: (value) =>
        /^".*"$/.test(value) ? value : JSON.stringify(value),
};

const styledObjectToTemplate = (fileInfo, api, { safe }) => {
    const log = (message, level = "info") => {
        if (level === "success") console.log(chalk.green(message));
        if (level === "info") console.log(chalk.white(message));
        if (level === "warning") {
            if (safe) {
                throw new Error(message);
            }
            console.log(chalk.yellow(message));
        }
        if (level === "error") console.log(chalk.red(message));
    };

    const j = api.jscodeshift;
    const n = api.jscodeshift.types.namedTypes;
    const root = j(fileInfo.source);

    log(
        chalk.bold.magenta(
            `\n####################### Starting transform for ${chalk.italic(
                fileInfo.path
            )} #######################`
        )
    );

    const normalizeTemplateLiteral = (templateLiteral) => {
        const { quasis, expressions } = templateLiteral;
        if (expressions.length > quasis.length)
            return j.templateLiteral(
                quasis,
                expressions.slice(0, quasis.length)
            );

        if (expressions.length < quasis.length - 1) {
            const mergedQuasisRaw = q
                .slice(e.length, q.length)
                .reduce(
                    (quasisAcc = "", { value }) => `${quasisAcc}${value.raw}`
                );
            const reducedQuasis = [
                ...q.slice(0, e.length),
                j.templateElement(
                    { cooked: mergedQuasisRaw, raw: mergedQuasisRaw },
                    false
                ),
            ];
            return j.templateLiteral(reducedQuasis, expressions);
        }

        return templateLiteral;
    };

    const mergeTemplateLiterals = (templateLiterals = []) => {
        return templateLiterals.reduce((acc, current) => {
            const normalizedTemplateLiteral = normalizeTemplateLiteral(current);
            const {
                quasis: currentQuasis,
                expressions: currentExpressions,
            } = normalizedTemplateLiteral;
            const { quasis: accQuasis, expressions: accExpressions } = acc;

            if (currentQuasis.length === 0) return acc;

            if (accQuasis.length === 0) return current;

            if (accQuasis.length === accExpressions.length)
                return j.templateLiteral(
                    [...accQuasis, ...currentQuasis],
                    [...accExpressions, ...currentExpressions]
                );

            const [firstCurrentQuasis, ...currentQuasisRest] = currentQuasis;
            const firstsAccQuasis = accQuasis.slice(0, -1);
            const lastAccQuasi = accQuasis.slice(-1)[0];

            const str = `${lastAccQuasi.value.raw}${firstCurrentQuasis.value.raw}`;
            return j.templateLiteral(
                [
                    ...firstsAccQuasis,
                    j.templateElement({ cooked: str, raw: str }, true),
                    ...currentQuasisRest,
                ],
                [...accExpressions, ...currentExpressions]
            );
        }, j.templateLiteral([], []));
    };

    const convertProperties = (
        properties,
        defaultValue = j.templateLiteral([], [])
    ) =>
        properties.reduce((acc, property) => {
            const {
                quasis: quasisAcc = [],
                expressions: expressionsAcc = [],
            } = acc;

            if (property.type !== n.Property.name)
                throw new Error(`Unsupported property type ${property.type}.`);

            if (property?.computed)
                throw new Error(`Unsupported computed property.`);

            const key = property.key;
            const value = property.value;
            const lastQuasi =
                quasisAcc.slice(-1)[0] ||
                j.templateElement({ cooked: "", raw: "" }, true);
            const firstsQuasis = quasisAcc.slice(0, quasisAcc.length - 1);

            const stringyfiedKey =
                key.type === "Literal" ? key.value : camelCaseToDash(key.name);

            if (value.type === n.ObjectExpression.name) {
                const convertedProps = convertProperties(value.properties);
                return mergeTemplateLiterals([
                    acc,
                    j.templateLiteral(
                        [
                            j.templateElement(
                                {
                                    cooked: `${stringyfiedKey}{\n`,
                                    raw: `${stringyfiedKey}{\n`,
                                },
                                true
                            ),
                        ],
                        []
                    ),
                    convertedProps,
                    j.templateLiteral(
                        [
                            j.templateElement(
                                { cooked: "}\n", raw: "}\n" },
                                true
                            ),
                        ],
                        []
                    ),
                ]);
            }

            if (value.type !== "Literal") {
                log(
                    `Warning: computed value found for ${chalk.italic(
                        stringyfiedKey
                    )}, please check.`,
                    "warning"
                );
                const str = `${lastQuasi.value.raw}${stringyfiedKey}: `;
                return mergeTemplateLiterals([
                    j.templateLiteral(firstsQuasis, expressionsAcc),
                    j.templateLiteral(
                        [j.templateElement({ cooked: str, raw: str }, false)],
                        [value]
                    ),
                    j.templateLiteral(
                        [
                            j.templateElement(
                                { cooked: ";\n", raw: ";\n" },
                                false
                            ),
                        ],
                        []
                    ),
                ]);
            }

            const testProp = stringyfiedKey.replace(/-/g, "").toLowerCase();
            const stringifiedValue = `${value.value}`;
            const valueWithUnit = isSimpleNumberReplacement(testProp)
                ? replaceSimpleNumbers(stringifiedValue)
                : stringifiedValue;
            const fixedValue =
                testProp in customFixers
                    ? customFixers[testProp](valueWithUnit)
                    : valueWithUnit;
            const str = `${lastQuasi.value.raw}${stringyfiedKey}: ${fixedValue};\n`;
            return j.templateLiteral(
                [
                    ...firstsQuasis,
                    j.templateElement({ cooked: str, raw: str }, true),
                ],
                expressionsAcc
            );
        }, defaultValue);

    const objectExpressionToTemplateLiteral = (objectExpressionNodePath) => {
        const properties = objectExpressionNodePath.node.properties;
        return convertProperties(properties);
    };

    const arrowFunctionToTemplateLiteral = (arrowFunctionNodePath) => {
        const arrowFunction = arrowFunctionNodePath.node;
        if (arrowFunction.body.type !== n.ObjectExpression.name)
            throw new Error(`Unsupported complex function body.`);

        const { properties = [] } = arrowFunction.body;
        const { quasis, expressions } = convertProperties(properties);

        const arrowFunctionParamsIdentifiers = j(
            arrowFunctionNodePath.get("params")
        ).find(j.Identifier);

        const funcExpressions = expressions.map((expression) => {
            const expressionIdentifiers =
                expression.type === n.Identifier.name
                    ? [{ node: expression }]
                    : j(expression).find(j.Identifier);

            const sharedIdentifiers = expressionIdentifiers.filter(
                (expressionIdentifier) =>
                    arrowFunctionParamsIdentifiers.some(
                        (paramsIdentifier) =>
                            expressionIdentifier.node.name ===
                            paramsIdentifier.node.name
                    )
            );

            if (sharedIdentifiers.length > 0)
                return j.arrowFunctionExpression(
                    arrowFunctionNodePath.node.params,
                    expression,
                    true
                );

            return expression;
        });

        return j.templateLiteral(quasis, funcExpressions);
    };

    const nodePathToTemplateLiteral = (nodePath) => {
        const nodeType = nodePath.node.type;

        if (nodeType === n.ObjectExpression.name)
            return objectExpressionToTemplateLiteral(nodePath);

        if (nodeType === n.ArrowFunctionExpression.name)
            return arrowFunctionToTemplateLiteral(nodePath);

        throw new Error(`Unsupported node type ${nodeType}`);
    };

    const nodePathToTaggedTemplate = (nodePath) => {
        try {
            const identifier =
                nodePath?.parent?.node?.id?.name ||
                nodePath?.parent?.node?.type;

            log(
                `\nTrying to convert ${chalk.bold(
                    identifier
                )} from ${chalk.italic(fileInfo.path)}`
            );
            const tag = nodePath.get("callee").node;

            const templateLiterals = nodePath
                .get("arguments")
                .map(nodePathToTemplateLiteral);

            const templateLiteral = mergeTemplateLiterals([
                j.templateLiteral(
                    [j.templateElement({ cooked: "\n", raw: "\n" }, false)],
                    []
                ),
                ...templateLiterals,
            ]);
            const result = j.taggedTemplateExpression(tag, templateLiteral);

            log(`Successfully converted ${chalk.bold(identifier)}.`, "success");

            return result;
        } catch (e) {
            log(e.toString(), "error");
            return nodePath.node;
        }
    };

    //Find MemberExpression (ex: styled.div)
    root.find(j.CallExpression, {
        callee: {
            type: n.MemberExpression.name,
            object: { type: n.Identifier.name, name: "styled" },
        },
    }).replaceWith(nodePathToTaggedTemplate);

    //Find CallExpression (ex: styled(CustomComponent))
    root.find(j.CallExpression, {
        callee: {
            type: n.CallExpression.name,
            callee: { type: n.Identifier.name, name: "styled" },
        },
    }).replaceWith(nodePathToTaggedTemplate);

    return root.toSource();
};

export default styledObjectToTemplate;
