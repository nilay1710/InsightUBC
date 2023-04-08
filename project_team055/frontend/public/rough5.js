function goToMain() {
	window.location.href = "index.html";
}

function list() {
	document.getElementById("hi").innerHTML = "ahh";
	listDSets();
}
const divElem = document.getElementById("div");


// CITATION: https://developer.mozilla.org/en-US/docs/Web/Guide/AJAX/Getting_Started
// USE: used to format get request for server
// make a get request to the server
function listDSets() {
	const httpReq = new XMLHttpRequest();
	httpReq.onreadystatechange = () => {
		// process response from server-->
		if (httpReq.readyState === XMLHttpRequest.DONE) {
			if (httpReq.status === 200) { // listDSet only resolves (has no 400 error)
				// CITATION: https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement
				// USE: used to create a new html element
				let str = convertToHtmlList();
				let newList = document.createElement("div"); // create an unordered list
				let newResult = document.createTextNode(str);
				newList.appendChild(newResult);
				document.body.insertBefore(newList, document.getElementById("hi"))
				console.log(httpReq.body.result);
				divElem.textContent = convertToHtmlList();
			}
		}
		// else {    <- add this in if need be
		// }
	}
	httpReq.open("GET", "http://localhost:4321/datasets");
	httpReq.send();
}

// EFFECTS: receives a list of insight results and returns it in html form
function convertToHtmlList() {
	// {id: "new-dataset", kind: "sections", numRows: 60}
	// let htmlString = "";
	// for(const insightResult of result) {
	// 	htmlString = htmlString + "<b>id: </b>" + insightResult.id + "\n";
	// 	htmlString = htmlString + "<b>kind: </b>" + insightResult.kind + "\n";
	// 	htmlString = htmlString + "<b>Number of Rows: </b>" + insightResult.numRows + "\n";
	// }
	return "heloo";
}
