use crate::{application::api, json_extract};
use salvo::prelude::*;
use serde_json::{Value, json};

pub fn make_api_router() -> Router {
    Router::new()
        .push(Router::with_path("read_disks").get(read_disks))
        .push(Router::with_path("create_dir").post(create_dir))
        .push(Router::with_path("create_file").post(create_file))
        .push(Router::with_path("read_dir").post(read_dir))
        .push(Router::with_path("read_file").post(read_file))
        .push(Router::with_path("write_file").post(write_file))
        .push(Router::with_path("move").post(r#move))
        .push(Router::with_path("copy").post(copy))
        .push(Router::with_path("move_to_trash").post(move_to_trash))
        .push(Router::with_path("delete").post(delete))
}

fn make_error_res(err: impl AsRef<str>) -> Json<Value> {
    Json(json!({"success": false, "error": err.as_ref()}))
}

fn make_success_res(res: Value) -> Json<Value> {
    match res {
        Value::Object(mut map) => {
            map.insert("success".to_string(), json!(true));
            Json(json!(map))
        }
        _ => panic!("Response must be an object"),
    }
}

#[inline]
async fn wrap_json_input<T>(
    req: &mut Request,
    callback: impl AsyncFn(Value) -> Result<T, String>,
) -> Result<T, String> {
    match req.parse_json::<Value>().await {
        Ok(json) => callback(json).await,
        Err(_) => Err("Failed to parse JSON".into()),
    }
}

#[inline]
async fn wrap_json_output(res: &mut Response, data: Result<Value, String>) {
    let data = match data {
        Ok(value) => make_success_res(value),
        Err(e) => make_error_res(e),
    };
    res.render(data);
}

#[inline]
async fn wrap_json(
    req: &mut Request,
    res: &mut Response,
    callback: impl AsyncFn(Value) -> Result<Value, String>,
) {
    wrap_json_output(res, wrap_json_input(req, callback).await).await;
}

#[handler]
pub async fn read_disks(res: &mut Response) {
    wrap_json_output(
        res,
        api::read_disks()
            .await
            .map(|disks| json!({ "disks": disks })),
    )
    .await;
}

#[handler]
pub async fn create_dir(req: &mut Request, res: &mut Response) {
    wrap_json(req, res, async |json| {
        json_extract!(json => { dst: String });
        api::create_dir(&dst).await?;
        Ok(json!({}))
    })
    .await;
}

#[handler]
pub async fn create_file(req: &mut Request, res: &mut Response) {
    wrap_json(req, res, async |json| {
        json_extract!(json => { dst: String });
        api::create_file(&dst).await?;
        Ok(json!({}))
    })
    .await;
}

#[handler]
pub async fn read_dir(req: &mut Request, res: &mut Response) {
    wrap_json(req, res, async |json| {
        json_extract!(json => { src: String });
        let entries = api::read_dir(&src).await?;
        Ok(json!({ "entries": entries }))
    })
    .await;
}

#[handler]
pub async fn read_file(req: &mut Request, res: &mut Response) {
    let result = wrap_json_input(req, async |json| {
        json_extract!(json => { src: String });
        api::read_file(&src).await
    })
    .await;

    match result {
        Ok(file) => file.send(req.headers(), res).await,
        Err(e) => {
            res.status_code(StatusCode::BAD_REQUEST);
            res.render(make_error_res(e));
        }
    }
}

#[handler]
pub async fn write_file(req: &mut Request, res: &mut Response) {
    let Some(dst) = req.form::<String>("dst").await else {
        res.status_code(StatusCode::BAD_REQUEST);
        res.render(make_error_res("Field `dst` is required"));
        return;
    };
    let Some(file) = req.first_file().await else {
        res.status_code(StatusCode::BAD_REQUEST);
        res.render(make_error_res("No file provided"));
        return;
    };

    wrap_json_output(
        res,
        api::write_file_from_path(&dst, file.path())
            .await
            .map(|_| json!({})),
    )
    .await;
}

#[handler]
pub async fn r#move(req: &mut Request, res: &mut Response) {
    wrap_json(req, res, async |json| {
        json_extract!(json => { src: String, dst: String });
        api::r#move(&src, &dst).await?;
        Ok(json!({}))
    })
    .await;
}

#[handler]
pub async fn copy(req: &mut Request, res: &mut Response) {
    wrap_json(req, res, async |json| {
        json_extract!(json => { src: String, dst: String });
        api::copy(&src, &dst).await?;
        Ok(json!({}))
    })
    .await;
}

#[handler]
pub async fn move_to_trash(req: &mut Request, res: &mut Response) {
    wrap_json(req, res, async |json| {
        json_extract!(json => { src: String });
        api::move_to_trash(&src).await?;
        Ok(json!({}))
    })
    .await;
}

#[handler]
pub async fn delete(req: &mut Request, res: &mut Response) {
    wrap_json(req, res, async |json| {
        json_extract!(json => { src: String });
        api::delete(&src).await?;
        Ok(json!({}))
    })
    .await;
}

// #[handler]
// pub async fn login(req: &mut Request, res: &mut Response) {
//     let is_localhost = is_localhost(req);
//     wrap_json(req, res, async move |json| {
//         json_extract!(json => { password: String });
//         login(&password, is_localhost).await?;
//         Ok(json!({}))
//     })
//     .await;
// }

// #[handler]
// pub async fn read_sys_stats(res: &mut Response) {
//     wrap_json_output(
//         res,
//         api::read_sys_stats()
//             .await
//             .map(|stats| json!({ "stats": stats })),
//     )
//     .await;
// }

// #[handler]
// pub async fn ws_channel(req: &mut Request, res: &mut Response) -> Result<(), StatusError> {
//     WebSocketUpgrade::new()
//         .upgrade(req, res, |mut ws| async move {})
//         .await
// }
