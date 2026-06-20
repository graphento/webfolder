// use salvo::prelude::*;
// use std::sync::LazyLock;
// use tokio::sync::RwLock;

// pub type Datastore = Depot;

// static DATASTORE: LazyLock<RwLock<Datastore>> = LazyLock::new(|| RwLock::new(Datastore::new()));

// pub fn datastore() -> &'static RwLock<Datastore> {
//     &*DATASTORE
// }
