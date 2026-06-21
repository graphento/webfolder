mod application;
mod domain;
mod infrastructure;
mod interface;

use crate::{
    domain::Config,
    interface::{api::make_api_router, pages::make_embed_pages_router},
};
use include_dir::{Dir, include_dir};
use log::{debug, error, info, trace, warn};
use salvo::trailing_slash::remove_slash;
use salvo::{
    conn::rustls::{Keycert, RustlsConfig},
    prelude::*,
};
use std::{net::Ipv4Addr, process::exit, time::Duration};

static FRONTEND: Dir = include_dir!("../frontend/");

#[tokio::main]
async fn main() {
    let config = get_config();
    set_logging(config.log_level());

    let router = Router::new()
        .hoop(remove_slash())
        .push(make_api_router().path("api"))
        .push(make_embed_pages_router(&FRONTEND));

    let socket_addr = (Ipv4Addr::LOCALHOST, config.port());
    let acceptor = TcpListener::new(socket_addr).bind().await;

    info!("Listening on http://{}:{}", socket_addr.0, socket_addr.1);

    Server::new(acceptor).serve(router).await;

    // if config.certpath().is_some() && config.keypath().is_some() {
    //     let acceptor = TcpListener::new(socket_addr)
    //         .rustls(async_stream::stream! {
    //             loop {
    //                 info!("Reloading TLS certificate");
    //                 yield load_tls_config(config.certpath().unwrap(), config.keypath().unwrap());
    //                 tokio::time::sleep(Duration::from_secs(60 * 60 * 12)).await;
    //             }
    //         })
    //         .bind()
    //         .await;

    //     Server::new(acceptor).serve(router).await;
    // } else {
    //     warn!("Missing certpath or keypath setting. App will be accessible from localhost only.");

    //     let acceptor = TcpListener::new(socket_addr).bind().await;
    //     Server::new(acceptor).serve(router).await;
    // }
}

fn get_config() -> Config {
    match std::fs::read_to_string("config.toml") {
        Ok(content) => match toml::from_str(&content) {
            Ok(config) => config,
            Err(e) => {
                println!("Failed to parse config.toml: {}\nUsing defaults", e);
                Config::default()
            }
        },
        Err(e) => {
            println!("Failed to read config.toml: {}\nUsing defaults", e);
            Config::default()
        }
    }
}

fn set_logging(level: impl AsRef<str>) {
    let level = level.as_ref().to_lowercase();

    let level = match level.as_str() {
        "trace" => log::LevelFilter::Trace,
        "debug" => log::LevelFilter::Debug,
        "info" => log::LevelFilter::Info,
        "warn" => log::LevelFilter::Warn,
        "error" => log::LevelFilter::Error,
        "off" => log::LevelFilter::Off,
        level => {
            println!("Unknown log level `{}`, using `info`", level);
            log::LevelFilter::Info
        }
    };

    pretty_env_logger::formatted_builder()
        .filter_level(level)
        .init();
}

// fn load_tls_config(certpath: impl AsRef<str>, keypath: impl AsRef<str>) -> RustlsConfig {
//     let cert = std::fs::read(certpath.as_ref()).unwrap_or_else(|e| {
//         error!("Failed to read certpath: {}", e);
//         exit(1);
//     });

//     let key = std::fs::read(keypath.as_ref()).unwrap_or_else(|e| {
//         error!("Failed to read keypath: {}", e);
//         exit(1);
//     });

//     RustlsConfig::new(Keycert::new().cert(cert).key(key))
// }
