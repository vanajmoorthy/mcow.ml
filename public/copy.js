let clipboard = new ClipboardJS(".far");

clipboard.on("success", function (e) {
	console.info("Text:", e.text);
	e.clearSelection();
});

let div = document.getElementById("output");
div.addEventListener("click", copy);

function copy() {
	if (!document.getElementById("p")) {
		let p = document.createElement("p");
		div.appendChild(p);
		p.id = "p";
		p.innerText = "URL copied successfully!";
	}
}
