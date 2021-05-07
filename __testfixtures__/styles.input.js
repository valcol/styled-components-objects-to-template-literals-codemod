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

export default styled.div((props) => ({
    color: "blue",
    fontSize: props.fontSize,
}));
