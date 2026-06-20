# Backend structure

## Infrastructure

low-level code

## Domain

multilayer datatypes

# Application

handling user input

# Interface

client-server top-level interactions


## API

- read_disks() -> listing
- create_dir(dst) -> new?
- create_file(dst) -> new?
- read_dir(src) -> listing if exist? & readable?
- read_file(src, start?, len?) -> stream if exist? & readable?
- write_file(dst, data) -> exist? & writable?
- move(src, dst) -> exist_src? & !exist_dst? & readable_src? & writable_dst? & writable_src?
- copy(src, dst) -> exist_src? & !exist_dst? & readable_src? & writable_dst?
- move_to_trash(src) -> exist_src? & writable_src?
- delete(src) -> exist_src? & writable_src?

- login(passwd) -> token if matches?
- read_sys_stats(cpu, ram, net)