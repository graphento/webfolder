"use strict";

import qw from "./shared/scripts/quickwork.js";
import pathutils from "./shared/scripts/pathutils.js";
import wfapi from "./shared/scripts/fakewfapi.js";

const qwnew = qw.new;

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
  }

  async showListView(path) {
    const entries = await wfapi.readDir(path).catch((err) => []);

    const pathDirsDisplay = [];
    let currentPath = "/";
    for (const dir of pathutils.dirs(path)) {
      currentPath += dir + "/";
      pathDirsDisplay.push({ dir, path: currentPath });
    }

    this.main.set("innerHTML", "");
    this.main.append(
      qwnew("div.listView").append(
        qwnew("div.listView_header").append(
          qwnew("div.listView_path").append(
            ...[
              qwnew("a.listView_path_item")
                .set("href", `?path=/`)
                .append("root"),
              ...pathDirsDisplay.map((display) =>
                qwnew("a.listView_path_item")
                  .set("href", `?path=${display.path}`)
                  .append(display.dir),
              ),
            ].flatMap((item) => [item, "/"]),
          ),
          qwnew("div.listView_actions").append(
            qwnew("button.listView_upload")
              .on("click", () => {
                wfapi.uploadFile(path).then(() => {
                  this.showListView(path);
                });
              })
              .append(
                "Загрузить",
                qwnew("svg.listView_upload_icon").append(
                  qwnew("use").setAttr(
                    "href",
                    "./shared/components/icons.svg#upload",
                  ),
                ),
              ),
          ),
        ),

        qwnew("div.listView_table").append(
          qwnew("div.listView_table_head").append(
            qwnew("div.listView_header_name").append("Имя"),
            qwnew("div.listView_header_mtime").append("Дата изменения"),
            qwnew("div.listView_header_size").append("Размер"),
          ),
          qwnew("div.listView_table_body")
            .on("dragover", (e) => {
              e.preventDefault();
              e.currentTarget.classList.add("drag-over");
            })
            .on("drop", (e) => {
              e.preventDefault();
              Promise.all(
                [...e.dataTransfer.files].map((file) =>
                  wfapi.writeFile(pathutils.join(path, file.name), file),
                ),
              ).then(() => {
                this.showListView(path);
              });
            })
            .on("dragleave", (e) => {
              e.preventDefault();
              e.currentTarget.remove("drag-over");
            })
            .append(
              ...entries.map((e) => {
                const isDir = e.metadata.mimetype === "inode/directory";
                const entryPath = isDir
                  ? pathutils.join(path, e.name + "/")
                  : pathutils.join(path, e.name);

                const element = qwnew("button.listView_entry")
                  .set("type", "button")
                  .append(
                    qwnew("div.listView_entry_name").append(e.name),
                    qwnew("div.listView_entry_mtime").append(e.metadata.mtime),
                    qwnew("div.listView_entry_size").append(
                      isDir ? "-" : formatSize(e.metadata.size),
                    ),
                  );

                if (isDir) {
                  element
                    .on("click", () => {
                      this.showListView(entryPath);
                    })
                    .on("dragover", (e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("drag-over");
                    })
                    .on("drop", (e) => {
                      e.preventDefault();
                      Promise.all(
                        [...e.dataTransfer.files].map((file) =>
                          wfapi.writeFile(
                            pathutils.join(entryPath, file.name),
                            file,
                          ),
                        ),
                      );
                    })
                    .on("dragleave", (e) => {
                      e.preventDefault();
                      e.currentTarget.remove("drag-over");
                    });
                } else {
                  element
                    .on("click", () => {
                      wfapi.downloadFile(entryPath);
                    })
                    .on("drag", (e) => {
                      e.dataTransfer.setData("text/plain", entryPath);
                    });
                }

                return element;
              }),
            ),
        ),
      ),
    );
  }
}

const webfolder = new Webfolder();

// Init

const pageParams = new URLSearchParams(window.location.search);
let path = pageParams.get("path") || "/";
path = pathutils.toValid(path);
if (!path) alert("Invalid path");
path = pathutils.toAbsolute(path);
webfolder.showListView(path);

qw.one(".header_search_input").on("change", (e) => {
  window.location.search = `?path=${e.target.value}`;
});
