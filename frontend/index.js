"use strict";

import qw from "./shared/scripts/quickwork.js";
import pathutils from "./shared/scripts/pathutils.js";
import wfapi from "./shared/scripts/fakewfapi.js";

const qwnew = qw.new;

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
          qwnew("div.listView_table_body").append(
            ...entries.map((e) =>
              qwnew("button.listView_entry")
                .set("type", "button")
                .append(
                  qwnew("div.listView_entry_name").append(e.name),
                  qwnew("div.listView_entry_mtime").append(e.mtime),
                  qwnew("div.listView_entry_size").append(e.size),
                ),
            ),
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
