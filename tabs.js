export let codeTab = {
    button: document.getElementById("codeButton"),
    window: document.getElementById("codeTab")
};
export let consoleTab = {
    button: document.getElementById("consoleButton"),
    window: document.getElementById("consoleTab")
};
export let graphTab = {
    button: document.getElementById("graphButton"),
    window: document.getElementById("graphTab")
};
export let blueprintTab = {
    button: document.getElementById("blueprintButton"),
    window: document.getElementById("blueprintTab")
};

let tabs = [codeTab, consoleTab, graphTab, blueprintTab];

let active = codeTab;

export function changeTab(tab) {
    active.button.classList.remove("ace-monokai");
    active.window.removeAttribute("selected");

    active = tab;
    active.button.classList.add("ace-monokai");
    active.window.setAttribute("selected", "");
}

for (const tab of tabs) {
    tab.button.addEventListener("click", () => changeTab(tab));
}
