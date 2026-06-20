use include_dir::Dir;
use salvo::prelude::*;

use crate::infrastructure::fs;

pub fn make_embed_pages_router(dir: &'static Dir<'_>) -> Router {
    Router::with_path("{**path}").goal(EmbedPages { dir })
}

struct EmbedPages {
    dir: &'static Dir<'static>,
}

#[handler]
impl EmbedPages {
    async fn handle(&self, req: &mut Request, res: &mut Response) {
        let path = req.param::<String>("path").unwrap_or_default();
        let path = path.trim_start_matches('/');
        let path = if path.is_empty() { "index.html" } else { path };
        let path = fs::normalize_path(path);

        if let Some(file) = self.dir.get_file(&path) {
            let content = file.contents();
            let mime_type = mime_guess::from_path(path).first_or_octet_stream();
            res.add_header("content-type", mime_type.as_ref(), true)
                .unwrap();
            res.add_header("Cache-Control", "public, max-age=31536000, immutable", true)
                .unwrap();
            res.write_body(content).unwrap();
        } else {
            res.status_code(StatusCode::NOT_FOUND);
        }
    }
}
