"use strict";

import qw from "./shared/scripts/quickwork.js";
import pathutils from "./shared/scripts/pathutils.js";
import wfapi from "./shared/scripts/fakewfapi.js";
import userprompt from "./shared/scripts/userprompt.js";

const qwnew = qw.new;

function formatSize(bytes) {
  const units = ["KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  if (unitIndex === 0) return `${Math.max(1, Math.round(value))} KB`;
  if (value < 10) return `${value.toFixed(2)} ${units[unitIndex]}`;
  if (value < 100) return `${value.toFixed(1)} ${units[unitIndex]}`;
  return `${Math.round(value)} ${units[unitIndex]}`;
}

function formatDate(ms) {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, "0");
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${MM}.${yyyy} ${hh}:${mm}`;
}

class Webfolder {
  constructor() {
    this.main = qw.one(".main");
    this.path = "/";
    this.clipboard = null;
    this.selected = new Set();
    this.contextMenu = document.querySelector(".listView_contextmenu");
    this.bindGlobalEvents();
  }

  get selection() {
    return [...this.selected];
  }

  bindGlobalEvents() {
    document.addEventListener("keydown", (e) => {
      if (e.target.matches("input, textarea")) return;
      if (e.ctrlKey && e.code === "KeyC") {
        e.preventDefault();
        this.copySelected();
      } else if (e.ctrlKey && e.code === "KeyX") {
        e.preventDefault();
        this.cutSelected();
      } else if (e.ctrlKey && e.code === "KeyV") {
        e.preventDefault();
        this.pasteClipboard();
      } else if (e.code === "Delete") {
        e.preventDefault();
        this.deleteSelected();
      }
    });

    document.addEventListener("click", (e) => {
      if (e.target.closest(".listView_contextmenu")) return;
      this.contextMenu?.classList.add("hidden");
    });

    for (const button of document.querySelectorAll("[data-action]")) {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        this.runContextAction(button.dataset.action);
        this.contextMenu?.classList.add("hidden");
      });
    }
  }

  runContextAction(action) {
    switch (action) {
      case "copy":
        this.copySelected();
        break;
      case "cut":
        this.cutSelected();
        break;
      case "paste":
        this.pasteClipboard();
        break;
      case "delete":
        this.deleteSelected();
        break;
      case "download":
        this.downloadSelected();
        break;
      case "upload":
        this.promptUploadFile();
        break;
      case "upload-dir":
        this.promptUploadDir();
        break;
      case "create-dir":
        this.createFolder();
        break;
    }
  }

  handleContextMenu(e) {
    e.preventDefault();
    const entry = e.target.closest(".listView_entry");
    if (entry) {
      const fullPath = entry.getAttribute("data-path");
      if (!e.ctrlKey && !e.metaKey) this.selected.clear();
      this.selected.add(fullPath);
    }
    this.showContextMenu(e.clientX, e.clientY);
    this.refreshSelectionHighlight();
  }

  refreshSelectionHighlight() {
    for (const entry of document.querySelectorAll(".listView_entry")) {
      const p = entry.getAttribute("data-path");
      entry.classList.toggle("listView_entry_selected", this.selected.has(p));
      const cb = entry.querySelector(".listView_entry_select");
      if (cb) cb.checked = this.selected.has(p);
    }
  }

  showContextMenu(x, y) {
    if (!this.contextMenu) return;
    this.contextMenu.classList.remove("hidden");
    const menu = this.contextMenu;
    menu.style.left =
      x + menu.offsetWidth < window.innerWidth
        ? `${x}px`
        : `${x - menu.offsetWidth}px`;
    menu.style.top =
      y + menu.offsetHeight < window.innerHeight
        ? `${y}px`
        : `${y - menu.offsetHeight}px`;
  }

  copySelected() {
    if (this.selection.length === 0) {
      alert("Сначала выделите элементы");
      return;
    }
    this.clipboard = { action: "copy", src: [...this.selection] };
  }

  cutSelected() {
    if (this.selection.length === 0) {
      alert("Сначала выделите элементы");
      return;
    }
    this.clipboard = { action: "cut", src: [...this.selection] };
  }

  async pasteClipboard() {
    if (!this.clipboard) {
      alert("Буфер пуст");
      return;
    }
    const clip = structuredClone(this.clipboard);
    try {
      for (const src of clip.src) {
        const dst = pathutils.join(this.path, pathutils.components(src).pop());
        if (clip.action === "cut" && src === dst) {
          alert("Вставьте в другую папку");
          return;
        }
        if (clip.action === "cut") await wfapi.move(src, dst);
        else await wfapi.copy(src, dst);
      }
      if (clip.action === "cut") this.clipboard = null;
      this.selected.clear();
      await this.showListView(this.path);
    } catch (err) {
      alert(`Ошибка: ${err.message}`);
      await this.showListView(this.path);
    }
  }

  async deleteSelected() {
    if (this.selection.length === 0) {
      alert("Сначала выделите элементы");
      return;
    }
    if (!confirm(`Удалить ${this.selection.length} элемент(ов)?`)) return;
    try {
      for (const p of this.selection) await wfapi.delete(p);
      this.selected.clear();
      await this.showListView(this.path);
    } catch (err) {
      alert(`Ошибка удаления: ${err.message}`);
      await this.showListView(this.path);
    }
  }

  async downloadSelected() {
    if (this.selection.length === 0) {
      alert("Сначала выделите файлы");
      return;
    }
    for (const p of this.selection) {
      try {
        await wfapi.downloadFile(p);
      } catch (err) {
        alert(err.message);
      }
    }
  }

  async promptUploadFile() {
    try {
      const file = await userprompt.selectFile();
      await wfapi.writeFile(pathutils.join(this.path, file.name), file);
      await this.showListView(this.path);
    } catch (err) {
      alert(`Ошибка загрузки: ${err.message}`);
    }
  }

  async promptUploadDir() {
    try {
      const dir = await userprompt.selectDir();
      for await (const file of dir) {
        await wfapi.writeFile(
          pathutils.join(this.path, file.webkitRelativePath),
          file,
        );
      }
      await this.showListView(this.path);
    } catch (err) {
      alert(`Ошибка загрузки папки: ${err.message}`);
    }
  }

  async createFolder() {
    const name = prompt("Имя новой папки:");
    if (!name?.trim()) return;
    const trimmed = name.trim().replace(/[\\/]+/g, "");
    try {
      await wfapi.createDir(pathutils.join(this.path, trimmed));
      await this.showListView(this.path);
    } catch (err) {
      alert(`Ошибка: ${err.message}`);
    }
  }

  async navigate(pathInput) {
    const path = String(pathInput ?? "").trim() || "/";
    if (!pathutils.isAbsolute(path)) {
      alert("Путь должен быть абсолютным");
      return;
    }

    let metadata;
    try {
      metadata = await wfapi.readMetadata(path);
      if (!metadata) {
        alert("Путь не существует");
        return;
      }
    } catch (err) {
      alert(`Не удалось открыть путь: ${err.message}`);
      return;
    }

    if (metadata.type === "file") {
      const components = pathutils.components(path);
      components.pop();
      let parent = pathutils.join("/", components.join("/"));
      this.selected.clear();
      this.selected.add(path);
      this.path = parent;
      history.replaceState(null, "", `?path=${encodeURIComponent(parent)}`);
      qw.one(".header_search_input").set("value", parent);
      await this.showListView(parent);
      return;
    }

    this.selected.clear();
    this.path = path;
    history.replaceState(null, "", `?path=${encodeURIComponent(path)}`);
    qw.one(".header_search_input").set("value", path);
    await this.showListView(path);
  }

  bindDropTarget(element, targetPath) {
    element
      .on("dragover", (e) => {
        e.preventDefault();
        e.currentTarget.classList.add("drag-over");
      })
      .on("dragleave", (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove("drag-over");
      })
      .on("drop", async (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove("drag-over");
        try {
          await Promise.all(
            [...e.dataTransfer.files].map((file) =>
              wfapi.writeFile(pathutils.join(targetPath, file.name), file),
            ),
          );
          await this.showListView(this.path);
        } catch (err) {
          alert(`Ошибка загрузки: ${err.message}`);
        }
      });
  }

  async showListView(path) {
    let result;
    try {
      result = await wfapi.readDir(path);
    } catch (err) {
      alert(`Не удалось открыть папку: ${err.message}`);
      return;
    }

    const metadata = result.metadata;
    const entries = result.entries;

    const validPath = pathutils.normalize_slashes(metadata.path);
    this.path = validPath;

    const pathDirsDisplay = [];
    let currentPath = "/";
    for (const dir of pathutils.components(validPath)) {
      currentPath = pathutils.join(currentPath, dir);
      pathDirsDisplay.push({ dir, path: currentPath });
    }

    const wf = this;
    const allSelected = entries.every((entry) => {
      let res = wf.selected.has(
        pathutils.join(validPath, pathutils.components(entry.path).pop()),
      );
      return res;
    });

    this.main.set("innerHTML", "");
    const tableBody = qwnew("div.listView_table_body");
    wf.bindDropTarget(tableBody, validPath);

    this.main.append(
      qwnew("div.listView")
        .on("contextmenu", (e) => wf.handleContextMenu(e))
        .append(
          qwnew("div.listView_header").append(
            qwnew("div.listView_path").append(
              ...[
                qwnew("a.listView_path_item")
                  .on("click", (e) => {
                    e.preventDefault();
                    wf.navigate("/");
                  })
                  .set("href", "?path=/")
                  .append("root"),
                ...pathDirsDisplay.map((display) =>
                  qwnew("a.listView_path_item")
                    .on("click", (e) => {
                      e.preventDefault();
                      wf.navigate(display.path);
                    })
                    .set("href", `?path=${encodeURIComponent(display.path)}`)
                    .append(display.dir),
                ),
              ].flatMap((item) => [item, "/"]),
            ),
          ),
          qwnew("div.listView_table").append(
            qwnew("div.listView_table_head").append(
              qwnew("input.listView_selectall")
                .set("type", "checkbox")
                .setAttr("checked", allSelected || undefined)
                .on("change", () => {
                  if (allSelected) wf.selected.clear();
                  else {
                    for (const entry of entries) {
                      wf.selected.add(
                        pathutils.join(
                          validPath,
                          pathutils.components(entry.path).pop(),
                        ),
                      );
                    }
                  }
                  wf.showListView(wf.path);
                }),
              qwnew("div.listView_header_name").append("Имя"),
              qwnew("div.listView_header_type").append("Тип"),
              qwnew("div.listView_header_mtime").append("Дата изменения"),
              qwnew("div.listView_header_size").append("Размер"),
            ),
            tableBody.append(
              ...(entries.length === 0
                ? [qwnew("div.listView_empty").append("Папка пуста")]
                : entries.map((entry) => {
                    const isDir = entry.type === "dir";
                    const isSelected = wf.selected.has(entry.path);

                    const row = qwnew("div.listView_entry")
                      .setAttr("data-path", entry.path)
                      .set(
                        "className",
                        `listView_entry${isSelected ? " listView_entry_selected" : ""}`,
                      )
                      .append(
                        qwnew("input.listView_entry_select")
                          .set("type", "checkbox")
                          .set("checked", isSelected)
                          .on("click", (ev) => ev.stopPropagation())
                          .on("change", (ev) => {
                            if (ev.target.checked) wf.selected.add(entry.path);
                            else wf.selected.delete(entry.path);
                            wf.refreshSelectionHighlight();
                          }),
                        qwnew("div.listView_entry_name").append(
                          pathutils.components(entry.path).pop(),
                        ),
                        qwnew("div.listView_entry_type").append(
                          isDir ? "Папка" : "Файл",
                        ),
                        qwnew("div.listView_entry_mtime").append(
                          entry.mtime === null ? "—" : formatDate(entry.mtime),
                        ),
                        qwnew("div.listView_entry_size").append(
                          isDir ? "—" : formatSize(entry.size),
                        ),
                      );

                    row.on("click", (ev) => {
                      if (ev.target.closest("input")) return;
                      if (ev.ctrlKey || ev.metaKey) {
                        if (isSelected) wf.selected.delete(entry.path);
                        else wf.selected.add(entry.path);
                      } else {
                        wf.selected.clear();
                        wf.selected.add(entry.path);
                      }
                      wf.refreshSelectionHighlight();
                    });

                    if (isDir) {
                      row.on("dblclick", () => wf.navigate(entry.path));
                      wf.bindDropTarget(row, entry.path);
                    } else {
                      row.setAttr("draggable", "true");
                      row.on("dblclick", () => wfapi.downloadFile(entry.path));
                      row.on("dragstart", (ev) => {
                        ev.dataTransfer.setData("text/plain", entry.path);
                      });
                    }

                    return row;
                  })),
            ),
          ),
        ),
    );
  }
}

const webfolder = new Webfolder();

const pageParams = new URLSearchParams(window.location.search);
let initPath = pageParams.get("path") || "/";

qw.one(".header_search_input").set("value", initPath);
qw.one(".header_search_input").on("keydown", (e) => {
  if (e.key === "Enter") webfolder.navigate(e.target.value);
});

webfolder.showListView(initPath);
