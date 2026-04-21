class WfApiTmp {
  constructor(base_url) {
    this.base_url = new URL(base_url, window.location.href);
  }

  async readDir(path) {
    const url = new URL(this.base_url);
    url.pathname += "/read_dir";
    url.searchParams.set("path", path);
    const res = await fetch(url);
    return await res.json();
  }

  async readFile(path) {
    const url = new URL(this.base_url);
    url.pathname += "/read_file";
    url.searchParams.set("path", path);
    const res = await fetch(url);
    return await res.json();
  }

  async createDir(path) {
    const url = new URL(this.base_url);
    url.pathname += "/create_dir";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: path,
      }),
    });
    return await res.json();
  }

  async delete(path) {
    const url = new URL(this.base_url);
    url.pathname += "/delete";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: path,
      }),
    });
    return await res.json();
  }

  async move(src, dst) {
    const url = new URL(this.base_url);
    url.pathname += "/move";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        src: src,
        dst: dst,
      }),
    });
    return await res.json();
  }

  async copy(src, dst) {
    const url = new URL(this.base_url);
    url.pathname += "/copy";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        src: src,
        dst: dst,
      }),
    });
    return await res.json();
  }

  async upload(file, path) {
    const url = new URL(this.base_url);
    url.pathname += "/upload";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });
    return await res.json();
  }

  async browserDownloadFile(path) {
    const url = new URL(this.base_url);
    url.pathname += "/download";
    url.searchParams.set("path", path);
    window.open(url);
  }
}

export const wfApi = new WfApiTmp("/api");
