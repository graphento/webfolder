let selectedSet = new Set();
let clipboard = null;
let currentPath = "/";
let currentFiles = [];
let lastSelectedIndex = null;

async function loadDir(path) {
  const res = await fetch(`/api/read_dir?path=${encodeURIComponent(path)}`);
  const data = await res.json();

  if (!data.success || !Array.isArray(data.contents)) {
    alert("Failed to load directory");
    return;
  }

  currentPath = path;
  currentFiles = data.contents; 
  selectedSet.clear(); //  сброс выбора при переходе
  lastSelectedIndex = null;
  renderFiles(currentFiles);
}

function renderFiles(files) {
  const root = document.getElementById("files");
  root.innerHTML = "";

  if (!files || files.length === 0) {
    root.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; color:#888;">
          Empty folder
        </td>
      </tr>
    `;
    return;
  }

  updateBreadcrumbs();

  files.forEach((f, index) => {
    const fullPath = currentPath === "/"
      ? "/" + f.name
      : currentPath + "/" + f.name;

    const tr = document.createElement("tr");

    if (selectedSet.has(fullPath)) {
      tr.classList.add("selected");
    }

    // CLICK LOGIC (Explorer)
    tr.onclick = (e) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      if (isShift && lastSelectedIndex !== null) {
        // range select
        selectedSet.clear();

        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);

        for (let i = start; i <= end; i++) {
          const file = files[i];
          const p = currentPath === "/"
            ? "/" + file.name
            : currentPath + "/" + file.name;

          selectedSet.add(p);
        }

      } else if (isCtrl) {
        // toggle
        if (selectedSet.has(fullPath)) {
          selectedSet.delete(fullPath);
        } else {
          selectedSet.add(fullPath);
        }

        lastSelectedIndex = index;

      } else {
        // single select
        selectedSet.clear();
        selectedSet.add(fullPath);
        lastSelectedIndex = index;
      }

      renderFiles(files);
    };

    // DOUBLE CLICK
    tr.ondblclick = () => {
      if (f.isDir) {
        loadDir(fullPath);
      } else {
        openFile(fullPath);
      }
    };

    // checkbox
    const checkTd = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedSet.has(fullPath);

    checkbox.onclick = (e) => e.stopPropagation();

    checkbox.onchange = () => {
      if (checkbox.checked) {
        selectedSet.add(fullPath);
      } else {
        selectedSet.delete(fullPath);
      }

      renderFiles(files);
    };

    checkTd.appendChild(checkbox);

    // name
    const nameTd = document.createElement("td");
    nameTd.textContent = f.name;

    // type
    const typeTd = document.createElement("td");
    typeTd.textContent = f.isDir ? "Folder" : "File";

    // size
    const sizeTd = document.createElement("td");
    sizeTd.textContent = "—";

    // modified
    const modTd = document.createElement("td");
    modTd.textContent = "—";

    // actions
    const actTd = document.createElement("td");

    const dl = document.createElement("button");
    dl.textContent = "⬇️";
    dl.onclick = (e) => {
      e.stopPropagation();
      window.open(`/api/download?path=${encodeURIComponent(fullPath)}`);
    };

    actTd.appendChild(dl);

    tr.appendChild(checkTd);
    tr.appendChild(nameTd);
    tr.appendChild(typeTd);
    tr.appendChild(sizeTd);
    tr.appendChild(modTd);
    tr.appendChild(actTd);

    root.appendChild(tr);
  });
}

function toggleAll(el) {
  const checkboxes = document.querySelectorAll("#files input[type=checkbox]");

  if (el.checked) {
    selectedSet.clear();

    currentFiles.forEach(f => {
      const fullPath = currentPath === "/"
        ? "/" + f.name
        : currentPath + "/" + f.name;

      selectedSet.add(fullPath);
    });
  } else {
    selectedSet.clear();
  }

  renderFiles(currentFiles); 
}

function updateBreadcrumbs() {
  const el = document.getElementById("breadcrumbs");
  el.textContent = "Home " + currentPath;
}

async function deleteSelected() {
  const arr = Array.from(selectedSet);

  for (const p of arr) {
    await deleteItem(p);
  }

  selectedSet.clear();
  loadDir(currentPath);
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
  if (selectedSet.size === 0) {
    alert("Nothing selected");
    return;
  }

  clipboard = {
    type: "copy",
    paths: Array.from(selectedSet)
  };

  alert("Copied");
}

function moveSelected() {
  if (selectedSet.size === 0) {
    alert("Nothing selected");
    return;
  }

  clipboard = {
    type: "move",
    paths: Array.from(selectedSet)
  };

  alert("Move ready");
}

async function paste() {
  if (!clipboard) {
    alert("Clipboard empty");
    return;
  }

  for (const src of clipboard.paths) {
    const name = src.split("/").pop();
    const dst = currentPath + "/" + name;

    const url = clipboard.type === "move" ? "/api/move" : "/api/copy";

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ src, dst })
    });
  }

  if (clipboard.type === "move") {
    clipboard = null;
  }

  selectedSet.clear();
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