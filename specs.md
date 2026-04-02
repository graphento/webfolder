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
    dst: path
  response:
    success: bool
    # http no resume
    endpoint: url # to upload as multipart form

upload_file:
  args:
    dst: path
  response:
    success: bool
    # http no resume
    endpoint: url # to upload as multipart form

download_dir:
  args:
    src: path
  response: # actually zip
    success: bool
    # http:
    endpoint: url # download context

download_file:
  args:
    src: path
  response:
    success: bool
    # http:
    endpoint: url # download context

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
