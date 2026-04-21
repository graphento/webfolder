import { globalElementSelector } from "./shared/scripts/element_selection.mjs";
import { wfApi } from "./shared/scripts/wf_api_tmp.mjs";
import { keybindManager } from "./shared/scripts/keybind.mjs";
import { getNameFromPath } from "./shared/scripts/path_utils.mjs";

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

          function formatSize(bytes) {
            if (!bytes) return "0 B";

            const sizes = ["B", "KB", "MB", "GB"];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));

            return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
          }

          for (const element of entryElement.getElementsByClassName(
            "browser__entry__size",
          )) {
            if (entry.isDir) continue;
            element.innerText = formatSize(entry.size);
          }

          for (const element of entryElement.getElementsByClassName(
            "browser__entry__mtime",
          )) {
            element.innerText = new Date(entry.mtime).toLocaleString();
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

  copySelected() {
    wfManager.clipboard = {
      action: "copy",
      src: [...wfManager.selection],
    };
    console.log(wfManager.clipboard);
  }

  cutSelected() {
    wfManager.clipboard = {
      action: "cut",
      src: [...wfManager.selection],
    };
    console.log(wfManager.clipboard);
  }

  deleteSelected() {
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
  }

  pasteClipboard() {
    if (!wfManager.clipboard) return;

    const clipboard = structuredClone(wfManager.clipboard);

    switch (clipboard.action) {
      case "cut":
        Promise.all(
          clipboard.src.map((path) => {
            console.log(wfManager.path + getNameFromPath(path));
            return wfApi.move(
              path,
              wfManager.path + "/" + getNameFromPath(path),
            );
          }),
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
          clipboard.src.map((path) => {
            console.log(wfManager.path + getNameFromPath(path));
            return wfApi.move(
              path,
              wfManager.path + "/" + getNameFromPath(path),
            );
          }),
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
  }

  downloadSelected() {
    for (const path of wfManager.selection) {
      wfApi.browserDownloadFile(path);
    }
  }

  promptUpload() {
    const input = document.createElement("input");
    input.type = "file";

    input.onchange = (e) => {
      wfApi.upload(e.target.files[0], wfManager.path).then((res) => {
        if (!res.success) {
          alert("Failed to upload: " + res.error);
          return;
        }
        wfManager.updateDirView();
      });
    };

    input.click();
  }
}

const wfManager = new WfManager("/");

globalElementSelector.forEachWithClass("browser", (browser) => {
  const view = browser.getElementsByClassName("browser__view")[0];
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

  const contextMenu = browser.getElementsByClassName("browser__contextmenu")[0];

  browser.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    const x = event.clientX;
    const y = event.clientY;

    contextMenu.classList.remove("hidden");

    if (x + contextMenu.offsetWidth < window.innerWidth) {
      contextMenu.style.left = x + "px";
    } else {
      contextMenu.style.left = x - contextMenu.offsetWidth + "px";
    }

    if (y + contextMenu.offsetHeight < window.innerHeight) {
      contextMenu.style.top = y + "px";
    } else {
      contextMenu.style.top = y - contextMenu.offsetHeight + "px";
    }
  });

  document.addEventListener("click", (event) => {
    contextMenu.classList.add("hidden");
  });
});

keybindManager.bindCtrl("KeyC", () => {
  wfManager.copySelected();
});
keybindManager.bindCtrl("KeyX", () => {
  wfManager.cutSelected();
});
keybindManager.bindSingle("Delete", () => {
  wfManager.deleteSelected();
});
keybindManager.bindCtrl("KeyV", () => {
  wfManager.pasteClipboard();
});

globalElementSelector.forEachWithClass(
  "browser__contextmenu__action--copy",
  (button) => {
    button.addEventListener("click", (event) => wfManager.copySelected());
  },
);

globalElementSelector.forEachWithClass(
  "browser__contextmenu__action--cut",
  (button) => {
    button.addEventListener("click", (event) => wfManager.cutSelected());
  },
);

globalElementSelector.forEachWithClass(
  "browser__contextmenu__action--paste",
  (button) => {
    button.addEventListener("click", (event) => wfManager.pasteClipboard());
  },
);

globalElementSelector.forEachWithClass(
  "browser__contextmenu__action--delete",
  (button) => {
    button.addEventListener("click", (event) => wfManager.deleteSelected());
  },
);

globalElementSelector.forEachWithClass(
  "browser__contextmenu__action--delete",
  (button) => {
    button.addEventListener("click", (event) => wfManager.deleteSelected());
  },
);

globalElementSelector.forEachWithClass(
  "browser__contextmenu__action--download",
  (button) => {
    button.addEventListener("click", (event) => wfManager.downloadSelected());
  },
);

globalElementSelector.forEachWithClass(
  "browser__contextmenu__action--upload",
  (button) => {
    button.addEventListener("click", (event) => wfManager.promptUpload());
  },
);

globalElementSelector.forEachWithClass("header__path__input", (input) => {
  input.addEventListener("change", (event) => {
    wfManager.path = event.target.value;
  });
});
