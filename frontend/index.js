let selected = null;
let clipboard = null; // { type: "copy" | "move", path }
let currentPath = "/";

async function loadDir(path) {
  const res = await fetch(`/api/read_dir?path=${encodeURIComponent(path)}`);
  const data = await res.json();

  if (!data.success) {
    alert(data.error);
    return;
  }

  currentPath = path;
  document.getElementById("path").textContent = "Path: " + path;

  renderFiles(data.contents);
}

function renderFiles(files) {
  const root = document.getElementById("files");
  root.innerHTML = "";

  files.forEach(f => {
    const fullPath = currentPath + "/" + f.name;

    const div = document.createElement("div");

    div.textContent = f.name + (f.isDir ? "/" : "");

    div.style.cursor = "pointer";

    // выделение
    if (selected === fullPath) {
      div.style.background = "#ddd";
    }

    div.onclick = () => {
      selected = fullPath;
      renderFiles(files);
    };

    // открытие по двойному клику
    div.ondblclick = () => {
      if (f.isDir) {
        loadDir(fullPath);
      } else {
        openFile(fullPath);
      }
    };

    // delete & download
    const del = document.createElement("button");
    del.textContent = "❌";
    del.onclick = async (e) => {
      e.stopPropagation();
      await deleteItem(fullPath);
    };
    const download = document.createElement("button");
    download.textContent = "⬇️";
    download.onclick = (e) => {
    e.stopPropagation();
    window.open(`/api/download?path=${encodeURIComponent(fullPath)}`);
    };

    div.appendChild(download);
    div.appendChild(del);
    root.appendChild(div);
  });
}

async function openFile(path) {
  const res = await fetch(`/api/read_file?path=${encodeURIComponent(path)}`);
  const data = await res.json();

  if (!data.success) {
    alert(data.error);
    return;
  }

  alert(data.contents);
}

async function createFolder() {
  const name = prompt("Folder name:");
  if (!name) return;

  const res = await fetch("/api/create_dir", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      path: currentPath + "/" + name
    })
  });

  const data = await res.json();

  if (!data.success) {
    alert(data.error);
  }

  loadDir(currentPath);
}

async function deleteItem(path) {
  const res = await fetch("/api/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ path })
  });

  const data = await res.json();

  if (!data.success) {
    alert(data.error);
  }

  loadDir(currentPath);
}

function goUp() {
  if (currentPath === "/") return;

  const parts = currentPath.split("/").filter(Boolean);
  parts.pop();

  const newPath = "/" + parts.join("/");
  loadDir(newPath || "/");
}

function copySelected() {
  if (!selected) {
    alert("Nothing selected");
    return;
  }

  clipboard = {
    type: "copy",
    path: selected
  };

  alert("Copied: " + selected);
}

function moveSelected() {
  if (!selected) {
    alert("Nothing selected");
    return;
  }

  clipboard = {
    type: "move",
    path: selected
  };

  alert("Move: " + selected);
}

async function paste() {
  if (!clipboard) {
    alert("Clipboard empty");
    return;
  }

  const name = clipboard.path.split("/").pop();
  const destination = currentPath + "/" + name;

  let url = "/api/copy";

  if (clipboard.type === "move") {
    url = "/api/move";
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      src: clipboard.path,
      dst: destination
    })
  });

  const data = await res.json();

  if (!data.success) {
    alert(data.error);
    return;
  }

  if (clipboard.type === "move") {
    clipboard = null;
    selected = null;
  }

  loadDir(currentPath);
}

async function uploadFile() {
  const input = document.getElementById("fileInput");
  const file = input.files[0];

  if (!file) {
    alert("Select file");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("path", currentPath);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  if (!data.success) {
    alert(data.error);
  }

  input.value = "";
  loadDir(currentPath);
}
// init
loadDir("/");