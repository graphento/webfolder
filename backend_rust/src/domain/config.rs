use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
#[serde(default)]
pub struct Config {
    port: u16,
    // webpath: Option<String>,
    // password: Option<String>,
    log_level: String,
    // certpath: Option<String>,
    // keypath: Option<String>,
}

impl Config {
    pub fn port(&self) -> u16 {
        self.port
    }
    // pub fn webpath(&self) -> Option<&str> {
    //     self.webpath.as_deref()
    // }
    // pub fn password(&self) -> Option<&str> {
    //     self.password.as_deref()
    // }
    pub fn log_level(&self) -> &str {
        &self.log_level
    }
    // pub fn certpath(&self) -> Option<&str> {
    //     self.certpath.as_deref()
    // }
    // pub fn keypath(&self) -> Option<&str> {
    //     self.keypath.as_deref()
    // }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            port: 41141,
            // webpath: None,
            // password: None,
            log_level: "info".to_string(),
            // certpath: None,
            // keypath: None,
        }
    }
}
