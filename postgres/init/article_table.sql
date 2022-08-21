create table if not exists article (
      id            bigserial          primary key,
      content       text               not null,
      createdAt    timestamp          not null default current_timestamp
);

create index article_created_at on article (created_at);