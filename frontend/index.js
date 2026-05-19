"use strict";

import qw from "./shared/scripts/quickwork.js";
import pathutils from "./shared/scripts/pathutils.js";
import wfapi from "./shared/scripts/fakewfapi.js";

const qwnew = qw.new;

function joinPath(base, name) {
  return pathutils.join(base, name);
}

function formatSize(bytes) {
  console.log(bytes);
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
        const dst = joinPath(this.path, pathutils.filename(src));
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
      await wfapi.uploadFile(this.path);
      await this.showListView(this.path);
    } catch (err) {
      alert(`Ошибка загрузки: ${err.message}`);
    }
  }

  async promptUploadDir() {
    try {
      await wfapi.uploadDir(this.path);
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
      await wfapi.createDir(joinPath(this.path, trimmed));
      await this.showListView(this.path);
    } catch (err) {
      alert(`Ошибка: ${err.message}`);
    }
  }

  parentPath(path) {
    const p = path.replace(/\/+$/, "");
    const idx = p.lastIndexOf("/");
    return idx <= 0 ? "/" : p.slice(0, idx);
  }

  async navigate(pathInput) {
    const raw = String(pathInput ?? "").trim();
    if (!raw) return;
    const valid = pathutils.toValid(pathutils.toAbsolute(raw));
    if (!valid) {
      alert("Неверный путь");
      return;
    }

    let kind;
    try {
      kind = await wfapi.entryKind(valid);
    } catch (err) {
      alert(`Не удалось открыть путь: ${err.message}`);
      return;
    }

    if (kind === null) {
      alert("Ничего не найдено");
      return;
    }

    if (kind === "file") {
      const parent = pathutils.toValid(this.parentPath(valid)) || "/";
      this.selected.clear();
      this.selected.add(valid);
      this.path = parent;
      history.replaceState(null, "", `?path=${encodeURIComponent(parent)}`);
      qw.one(".header_search_input").set("value", parent);
      await this.showListView(parent);
      return;
    }

    this.selected.clear();
    this.path = valid;
    history.replaceState(null, "", `?path=${encodeURIComponent(valid)}`);
    qw.one(".header_search_input").set("value", valid);
    await this.showListView(valid);
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
              wfapi.writeFile(joinPath(targetPath, file.name), file),
            ),
          );
          await this.showListView(this.path);
        } catch (err) {
          alert(`Ошибка загрузки: ${err.message}`);
        }
      });
  }

  async showListView(path) {
    const validPath = pathutils.toValid(pathutils.toAbsolute(path)) || "/";
    this.path = validPath;

    let entries = [];
    try {
      entries = await wfapi.readDir(validPath);
    } catch (err) {
      alert(`Не удалось открыть папку: ${err.message}`);
      return;
    }

    const pathDirsDisplay = [];
    let currentPath = "/";
    for (const dir of pathutils.dirs(validPath)) {
      currentPath = joinPath(currentPath, dir);
      pathDirsDisplay.push({ dir, path: currentPath });
    }

    const wf = this;
    const allSelected =
      entries.length > 0 &&
      entries.every((e) => wf.selected.has(joinPath(validPath, e.name)));

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
                  .set("href", "?path=/")
                  .append("root"),
                ...pathDirsDisplay.map((d) =>
                  qwnew("a.listView_path_item")
                    .set("href", `?path=${encodeURIComponent(d.path)}`)
                    .append(d.dir),
                ),
              ].flatMap((item) => [item, "/"]),
            ),
          ),
          qwnew("div.listView_table").append(
            qwnew("div.listView_table_head").append(
              qwnew("input.listView_selectall")
                .set("type", "checkbox")
                .set("checked", allSelected)
                .on("change", () => {
                  if (allSelected) wf.selected.clear();
                  else {
                    for (const entry of entries) {
                      wf.selected.add(joinPath(validPath, entry.name));
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
                : entries.map((e) => {
                    const fullPath = joinPath(validPath, e.name);
                    const isDir = e.metadata.mimetype === "inode/directory";
                    const isSelected = wf.selected.has(fullPath);

                    const row = qwnew("div.listView_entry")
                      .setAttr("data-path", fullPath)
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
                            if (ev.target.checked) wf.selected.add(fullPath);
                            else wf.selected.delete(fullPath);
                            wf.refreshSelectionHighlight();
                          }),
                        qwnew("div.listView_entry_name").append(e.name),
                        qwnew("div.listView_entry_type").append(
                          isDir ? "Папка" : "Файл",
                        ),
                        qwnew("div.listView_entry_mtime").append(
                          e.metadata.mtime,
                        ),
                        qwnew("div.listView_entry_size").append(
                          isDir ? "—" : formatSize(e.metadata.size),
                        ),
                      );

                    row.on("click", (ev) => {
                      if (ev.target.closest("input")) return;
                      if (ev.ctrlKey || ev.metaKey) {
                        if (isSelected) wf.selected.delete(fullPath);
                        else wf.selected.add(fullPath);
                      } else {
                        wf.selected.clear();
                        wf.selected.add(fullPath);
                      }
                      wf.refreshSelectionHighlight();
                    });

                    if (isDir) {
                      row.on("dblclick", () => wf.navigate(fullPath));
                      wf.bindDropTarget(row, fullPath);
                    } else {
                      row.setAttr("draggable", "true");
                      row.on("dblclick", () => wfapi.downloadFile(fullPath));
                      row.on("dragstart", (ev) => {
                        ev.dataTransfer.setData("text/plain", fullPath);
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
let initPath = pathutils.toValid(
  pathutils.toAbsolute(pageParams.get("path") || "/"),
);
if (!initPath) initPath = "/";

qw.one(".header_search_input").set("value", initPath);
qw.one(".header_search_input").on("keydown", (e) => {
  if (e.key === "Enter") webfolder.navigate(e.target.value);
});

webfolder.showListView(initPath);
