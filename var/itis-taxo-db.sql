alter table hierarchy add column hierarchy_json jsonb;

create index hierarchy_tsn_ix on hierarchy (tsn);
create index hierarchy_parent_tsn_ix on hierarchy (parent_tsn);
create index hierarchy_level_ix on hierarchy (level);
create index hierarchy_hierarchy_json_ix on hierarchy using gin (hierarchy_json);

create index taxonomic_units_rank_id_ix on taxonomic_units (rank_id);
create index taxonomic_units_parent_tsn_ix on taxonomic_units (parent_tsn);

create index taxon_unit_types_rank_id_ix on taxon_unit_types (rank_id);

create materialized view mv_taxon_unit_types AS
  select kingdom_id, rank_id, rank_name, dir_parent_rank_id, req_parent_rank_id, max(update_date) as update_date
  from taxon_unit_types
  group by kingdom_id, rank_id, rank_name, dir_parent_rank_id, req_parent_rank_id
;

select
  tut.kingdom_id,
  k.kingdom_name,
  h.hierarchy_string,
  tu.rank_id,
  tut.rank_name,
  tu.complete_name,
  h.level
from hierarchy h
  left join taxonomic_units tu on tu.tsn = h.tsn
  left join mv_taxon_unit_types tut on tut.rank_id = tu.rank_id and tut.kingdom_id = tu.kingdom_id
  left join kingdoms k on k.kingdom_id = tut.kingdom_id
where h.level < 2;



select
  k.kingdom_id,
  k.kingdom_name,
  tut.rank_id,
  tut.rank_name
from kingdoms k
  left join mv_taxon_unit_types tut on tut.kingdom_id = k.kingdom_id
order BY
  k.kingdom_name,
    tut.rank_id
;


drop MATERIALIZED VIEW mv_vernaculars;
create MATERIALIZED VIEW mv_vernaculars AS
SELECT
  tsn, json_agg(to_json(ARRAY[vernacular_name, language])) as vernacular_name
from vernaculars
group by
  tsn
limit 1000
;



SELECT * from taxon_unit_types;
SELECT * from taxonomic_units where unit_name1 = 'Animalia';
SELECT * from hierarchy;
SELECT * from kingdoms;
SELECT * from vernaculars limit 500;
SELECT * from vern_ref_links limit 500;
SELECT * from geographic_div limit 500;
SELECT * from synonym_links limit 500;
SELECT * from jurisdiction limit 500;
SELECT * from longnames limit 500;


SELECT
  *
from hierarchy;



WITH RECURSIVE other AS
(
  -- non-recursive term
  SELECT
    ARRAY [ARRAY [tu.tsn :: TEXT, tu.complete_name :: TEXT]] AS path,
    0 :: integer                                             AS depth,
    tu.tsn,
    tu.parent_tsn,
    tu.complete_name,
    tu.kingdom_id,
    tu.rank_id
  FROM taxonomic_units tu
  WHERE
    tu.unit_name1 = 'Animalia'

  UNION ALL

  -- recursive term
  SELECT
    ARRAY [tu.tsn :: TEXT, tu.complete_name :: TEXT] || other.path AS path,
    other.depth + 1                                                AS depth,
    tu.tsn,
    tu.parent_tsn,
    tu.complete_name,
    tu.kingdom_id,
    tu.rank_id
  FROM
    other as other
    JOIN taxonomic_units tu
      ON other.tsn = tu.parent_tsn
)

  SELECT
    o.kingdom_id,
    o.tsn,
    o.parent_tsn,
    o.complete_name,
-- v.vernacular_name,
    o.rank_id,
    tut.rank_name,
    o.depth,
    o.path
  FROM other AS o
-- left join mv_vernaculars v on v.tsn = o.tsn
    LEFT JOIN taxon_unit_types tut
      ON tut.kingdom_id = o.kingdom_id AND tut.rank_id = o.rank_id
    where depth=17
  ORDER BY kingdom_id, rank_id, depth, path, complete_name
;
