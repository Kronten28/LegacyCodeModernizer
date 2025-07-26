use base64::{Engine, engine::general_purpose};
use chacha20poly1305::{
    Key, XChaCha20Poly1305, XNonce,
    aead::{Aead, KeyInit},
};
use clap::Parser;
use dirs::config_dir;
use keyring::Entry;
use rand::RngCore;
use std::{collections::HashMap, fs::create_dir, path::PathBuf};

const SERVICE: &str = "legacy_code_modernizer_api_manager";
const USERNAME: &str = "default_user";
const FILE_NAME: &str = "api.enc";

#[derive(Parser, Debug)]
#[command(
    name = SERVICE,
    version = "0.1.0",
    about = "Legacy Code Modernizer Api Keys Save and Encrypt Tool",
    arg_required_else_help = true
)]
struct Args {
    /// Set provider
    provider: String,
    /// Set or Update Api key
    #[arg(short, long, conflicts_with = "get")]
    set: Option<String>,
    /// Get provider's api key
    #[arg(short, long, conflicts_with = "set")]
    get: bool,
}
fn is_key_exist() -> bool {
    Entry::new(SERVICE, USERNAME)
        .unwrap()
        .get_password()
        .is_ok()
}
fn setup_key() -> Result<(), ()> {
    let mut key = [0u8; 32];
    rand::rng().fill_bytes(&mut key);
    let entry = Entry::new(SERVICE, USERNAME).unwrap();
    entry
        .set_password(&general_purpose::STANDARD.encode(&key))
        .unwrap();
    Ok(())
}
fn load_key() -> Result<[u8; 32], ()> {
    let entry = Entry::new(SERVICE, USERNAME).unwrap();
    let b64 = entry.get_password().unwrap();
    let vec = general_purpose::STANDARD.decode(b64).unwrap();
    let mut key = [0u8; 32];
    key.copy_from_slice(&vec);
    Ok(key)
}
/// Use XChaCha20-Poly1305 Decrypt
fn decrypt_config(key: &[u8; 32], ciphertext_b64: &str) -> Result<Vec<u8>, ()> {
    let data = general_purpose::URL_SAFE_NO_PAD
        .decode(ciphertext_b64)
        .unwrap();
    let (nonce_bytes, ct) = data.split_at(24);
    let cipher = XChaCha20Poly1305::new(Key::from_slice(key));
    Ok(cipher.decrypt(nonce_bytes.into(), ct).unwrap())
}
/// Use XChaCha20-Poly1305 Encrypt
fn encrypt_config(key: &[u8; 32], plaintext: &[u8]) -> Result<String, ()> {
    let cipher = XChaCha20Poly1305::new(Key::from_slice(key));
    let mut nonce = XNonce::default();
    rand::rng().fill_bytes(nonce.as_mut());
    let ciphertext = cipher.encrypt(&nonce, plaintext).unwrap();
    let mut combined = nonce.as_slice().to_vec();
    combined.extend(ciphertext);
    Ok(general_purpose::URL_SAFE_NO_PAD.encode(combined))
}
fn make_folder(path: &PathBuf) -> Result<(), String> {
    if !path.exists() {
        create_dir(path.clone()).unwrap();
    }
    // file exist, test if it's a dir
    if path.is_dir() {
        Ok(())
    } else {
        Err(String::from("Path is not a folder"))
    }
}
fn get_config_path() -> PathBuf {
    let path = config_dir()
        .expect("Could not get config directory")
        .join(SERVICE);
    make_folder(&path).unwrap();
    path.join(FILE_NAME)
}
fn load_config() -> Result<HashMap<String, String>, ()> {
    if !is_key_exist() {
        setup_key().unwrap();
    }
    let key = load_key().unwrap();
    let encrypted = match std::fs::read_to_string(get_config_path()) {
        Ok(val) => val,
        Err(_) => return Err(()),
    };
    let json = decrypt_config(&key, &encrypted).unwrap();
    Ok(serde_json::from_slice(&json).unwrap())
}
fn save_config(cfg: &HashMap<String, String>) {
    if !is_key_exist() {
        setup_key().unwrap();
    }
    let key = load_key().unwrap();
    let new_json = serde_json::to_vec_pretty(&cfg).unwrap();
    let enc = encrypt_config(&key, &new_json).unwrap();
    std::fs::write(get_config_path(), enc).unwrap();
}
fn main() {
    let config = load_config().unwrap_or(HashMap::new());
    let args = Args::parse();
    if args.get {
        println!(
            "{}",
            serde_json::json!({
                "status": "success",
                "provider": args.provider,
                "key": config.get(&args.provider).unwrap_or(&String::new()),
            })
        );
        return;
    }
    let mut config = config;
    config.insert(args.provider, args.set.unwrap());
    save_config(&config);
    println!(
        "{}",
        serde_json::json!({
            "status": "success",
        })
    );
}
