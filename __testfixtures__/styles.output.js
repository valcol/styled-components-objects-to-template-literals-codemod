export const MyCustomComponent = styled.div`
color: red;
font-size: ${fontSizeSmall};
margin-bottom: 5px;
& > div {
padding-top: 10px;
margin-left: 10px;
}
`;

export const MyCustomComponentBis = styled.div`
color: blue;
font-size: ${props => props.fontSize};
`;

export const MyCustomComponentAgain = styled.div`
margin-bottom: 5px;
color: blue;
font-size: ${({ fontSize }) => fontSize};
`;
