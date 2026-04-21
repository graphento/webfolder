import { globalElementSelector } from "./shared/scripts/element_selection.mjs";
import { wfApi } from "./shared/scripts/wf_api_tmp.mjs";
import { keybindManager } from "./shared/scripts/keybind.mjs";

class WfManager {
  #path;
  clipboard;

  constructor(path) {
    this.path = path;
    for (const input of document.getElementsByClassName(
      "header__path__input",
    )) {
      input.value = path;
    }
  }

  updateDirView() {
    const dirPath = this.#path;
    wfApi.readDir(dirPath).then((res) => {
      if (!res.success) {
        alert("Failed to load directory: " + res.error);
        return;
      }

      // TODO: opitimize
      const entryTemplate = document.getElementById("browser__entry__template")
        .content.children[0];

      for (const container of document.getElementsByClassName(
        "browser__main",
      )) {
        container.innerHTML = "";

        for (const entry of res.contents) {
          const entryElement = entryTemplate.cloneNode(true);

          for (const element of entryElement.getElementsByClassName(
            "browser__entry__name",
          )) {
            element.value = entry.name;
          }

          for (const element of entryElement.getElementsByClassName(
            "browser__entry__type",
          )) {
            element.innerText = entry.isDir ? "Папка" : "Файл";
          }

          container.appendChild(entryElement);
        }
      }
    });
  }

  get path() {
    return this.#path;
  }

  get selection() {
    const currentPath = this.#path;
    const selection = [];
    for (const container of document.getElementsByClassName("browser__main")) {
      for (const element of container.getElementsByClassName(
        "browser__entry",
      )) {
        const checkbox = element.getElementsByClassName(
          "browser__entry__select",
        )[0];

        if (!checkbox.checked) continue;

        const name = element.getElementsByClassName("browser__entry__name")[0]
          .value;

        const fullPath =
          currentPath === "/" ? "/" + name : currentPath + "/" + name;

        selection.push(fullPath);
      }
    }

    return selection;
  }

  set path(path) {
    this.#path = path;
    this.updateDirView();
  }
}

const wfManager = new WfManager("/");

keybindManager.bindCtrl("KeyC", () => {
  wfManager.clipboard = {
    action: "copy",
    src: [...wfManager.selection],
  };
  console.log(wfManager.clipboard);
});

keybindManager.bindCtrl("KeyX", () => {
  wfManager.clipboard = {
    action: "cut",
    src: [...wfManager.selection],
  };
  console.log(wfManager.clipboard);
});

keybindManager.bindSingle("Delete", () => {
  console.log(wfManager.selection);
  Promise.all(
    wfManager.selection.map((path) => wfApi.delete(path, wfManager.path)),
  ).then((results) => {
    for (const res of results) {
      if (!res.success) {
        alert("Failed to delete: " + res.error);
        wfManager.updateDirView();
        return;
      }
    }
    wfManager.updateDirView();
  });
});

keybindManager.bindCtrl("KeyV", () => {
  if (!wfManager.clipboard) return;

  const clipboard = structuredClone(wfManager.clipboard);

  switch (clipboard.action) {
    case "cut":
      Promise.all(
        clipboard.src.map((path) => wfApi.move(path, wfManager.path)),
      ).then((results) => {
        for (const res of results) {
          if (!res.success) {
            alert("Failed to move: " + res.error);
            wfManager.updateDirView();
            return;
          }
        }
        wfManager.updateDirView();
      });
      break;

    case "copy":
      Promise.all(
        clipboard.src.map((path) => wfApi.copy(path, wfManager.path)),
      ).then((results) => {
        for (const res of results) {
          if (!res.success) {
            alert("Failed to copy: " + res.error);
            wfManager.updateDirView();
            return;
          }
        }
        wfManager.updateDirView();
      });
      break;
  }
});

globalElementSelector.forEachWithClass("browser__view", (view) => {
  for (const multiselector of view.getElementsByClassName(
    "browser__selectall",
  )) {
    multiselector.addEventListener("change", (event) => {
      for (const selector of view.getElementsByClassName(
        "browser__entry__select",
      )) {
        selector.checked = event.target.checked;
      }
    });
  }
});

globalElementSelector.forEachWithClass("header__path__input", (input) => {
  input.addEventListener("change", (event) => {
    wfManager.path = event.target.value;
  });
});
