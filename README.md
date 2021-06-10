# styled-components-objects-to-template-literals-codemod

Transforms styled-components style objects to tagged template literals

# How to install

```bash
npm install -g https://github.com/valcol/styled-components-objects-to-template-literals-codemod
```

or

```bash
yarn global add https://github.com/valcol/styled-components-objects-to-template-literals-codemod
```

# How to use

```bash
styled-components-objects-to-template-literals-codemod <path>
```

You can pass the `--safe` option to transform only components who don't log warnings :

```bash
styled-components-objects-to-template-literals-codemod <path> --safe
```

**Will modify files in place, so make sure you can recover if it goes wrong!**

You can pass the `-p -d` options if you only want to have a preview of the file without overwritting it :

```bash
styled-components-objects-to-template-literals-codemod <path> --safe -p -d
```

See https://github.com/facebook/jscodeshift/ for more options

# In/Out

In

```js
export const MyCustomComponent = styled.div({
    color: "red",
    fontSize: fontSizeSmall,
    marginBottom: 5,
    "& > div ": {
        paddingTop: "10px",
        marginLeft: "10px",
    },
});

export const MyCustomComponentBis = styled.div((props) => ({
    color: "blue",
    fontSize: props.fontSize,
}));

export const MyCustomComponentAgain = styled.div(
    {
        marginBottom: 5,
    },
    ({ fontSize }) => ({
        color: "blue",
        fontSize,
    })
);
```

Out

```js
export const MyCustomComponent2 = styled.div`
    color: red;
    font-size: ${fontSizeSmall};
    margin-bottom: 5px;
    & > div {
        padding-top: 10px;
        margin-left: 10px;
    }
`;

export const MyCustomComponentBis2 = styled.div`
    color: blue;
    font-size: ${(props) => props.fontSize};
`;

export const MyCustomComponentAgain = styled.div`
    margin-bottom: 5px;
    color: blue;
    font-size: ${({ fontSize }) => fontSize};
`;
```

# Caveats

-   When computed values are used you may have to manually transform them, you'll find a warning in the console.
-   Transform only (for now?) simple objets (no computed properties, no spread...) and arrow function who directly return an object.
-   You'll have to reformat the file after the transformation (prettier ftw).
