
type TestProps = {
    top: number
}

function Test() {
    return (
        <div id="test" style={{
            position: 'absolute',
            width: "100px",
            height: "100px",
            top: `100px`,
            left: "100px"
        }}>
            top: by js
        </div >
    );
}

export default Test;
