## Спецификация

### Настройки сервера

```yaml
webpath: supersecretpath
port: 41141
users:
  - username: root
    password: P4$$W0RD # password auth
    public_key_path: /etc/ssl/wfcerts/pub.pem # webauthn
    access_user: root # determining permissions
    access_group: wheel # determining permissions
```

### API ивент

```yaml
event_type: create_dir
args:
  dest: /root/measures
```

### Методы API

```yaml
create_dir:
  args:
    dest: path
  response:
    success: bool

upload_dir:
  args:
    upload_id: id
    dst: path
  response: TBD

upload_file:
  args:
    upload_id: id
    dst: path
  response: TBD

download_dir:
  args:
    src: path
  response: TBD

download_file:
  args:
    src: path
  response: TBD

read_file:
  args:
    src: path
    start: index | null
    endex: index | null
  response:
    success: bool
    contents: bytes

read_dir:
  args:
    src: path
  response:
    success: bool
    contents:
      entry:
        name: str
        metadata: TBD

move:
  args:
    src: path
    dst: path
  response:
    success: bool

copy:
  args:
    src: path
    dst: path
  response:
    success: bool

move_to_trash:
  args:
    src: path
  response:
    success: bool

delete:
  args:
    src: path
  response:
    success: bool
```
