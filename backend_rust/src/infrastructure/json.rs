#[macro_export]
macro_rules! json_extract {
    ($json:expr => {$($field:ident : $ty:ty),* $(,)?}) => {
        #[allow(unused_parens)]
        let ($($field),*) : ($($ty),*) = {
            let mut json = $json;
            ($(match json.get_mut(stringify!($field)) {
                Some(json_value) => match serde_json::from_value(json_value.take()) {
                    Ok(value) => value,
                    _ => return Err(concat!("Field `", stringify!($field), "` has wrong type").into()),
                },
                _ => return Err(concat!("Field `", stringify!($field), "` is required").into()),
            }),*)
        };
    };
}
