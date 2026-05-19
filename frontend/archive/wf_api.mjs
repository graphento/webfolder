export class WfApi {
  constructor(base_url) {
    this.base_url = base_url;
  }

  async #sendEvent(event) {
    const res = await fetch(this.base_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });
    return await res.json();
  }

  /**
   * @returns \{
   *   success: bool,
   *   error: string?
   *   contents: [{
   *     name: str,
   *     filetype: str,
   *     size: int?,
   *     mtime: timestamp
   *   }]
   * \}
   */
  readDir(dst) {
    return this.#sendEvent({
      event_type: "create_dir",
      args: {
        dst: dst,
      },
    });
  }

  // uploadDir(dst) {
  //   return this.#sendEvent({
  //     event_type: "upload_dir",
  //     args: {
  //       dst: dst,
  //     },
  //   });
  // }

  /**
   * @returns \{
   *   success: bool,
   *   error: string?
   * \}
   */
  uploadFile(file, dst) {
    return this.#sendEvent({
      event_type: "upload_file",
      args: {
        dst: dst,
      },
    });
  }

  // downloadDir(src) {
  //   return this.#sendEvent({
  //     event_type: "download_dir",
  //     args: {
  //       src: src,
  //     },
  //   });
  // }

  /**
   * @returns \{
   *   success: bool,
   *   error: string?,
   *   endpoint: string?
   * \}
   */
  downloadFile(src) {
    return this.#sendEvent({
      event_type: "download_file",
      args: {
        src: src,
      },
    });
  }

  /**
   * @returns \{
   *   success: bool,
   *   error: string?
   * \}
   */
  move(src, dst) {
    return this.#sendEvent({
      event_type: "download_file",
      args: {
        src: src,
        dst: dst,
      },
    });
  }

  /**
   * @returns \{
   *   success: bool,
   *   error: string?
   * \}
   */
  copy(src, dst) {
    return this.#sendEvent({
      event_type: "download_file",
      args: {
        src: src,
        dst: dst,
      },
    });
  }

  /**
   * @returns \{
   *   success: bool,
   *   error: string?
   * \}
   */
  delete(src) {
    return this.#sendEvent({
      event_type: "download_file",
      args: {
        src: src,
      },
    });
  }
}
