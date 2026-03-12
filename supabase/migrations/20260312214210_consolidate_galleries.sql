-- =====================================================
-- Gallery Consolidation: Merge 21 import duplicates into existing entries
-- Then delete emptied import galleries + test leftover
-- =====================================================

DO $$
DECLARE
  v_count INTEGER := 0;
BEGIN

  -- Helper: For each merge, update artworks + sales to point to KEEP gallery, then delete the MERGE gallery

  -- 1. Agence DS: 37c1b412 → cb0c58d7
  UPDATE artworks SET gallery_id = 'cb0c58d7-3886-442b-bc1f-f8efa7baba80' WHERE gallery_id = '37c1b412-97f1-4782-b5aa-289887190ad4';
  UPDATE sales SET gallery_id = 'cb0c58d7-3886-442b-bc1f-f8efa7baba80' WHERE gallery_id = '37c1b412-97f1-4782-b5aa-289887190ad4';
  DELETE FROM galleries WHERE id = '37c1b412-97f1-4782-b5aa-289887190ad4';
  v_count := v_count + 1;
  RAISE NOTICE '1/21 Agence DS merged';

  -- 2. Alte Brennerei: fdf53b31 → c3f49c24
  UPDATE artworks SET gallery_id = 'c3f49c24-eddf-4ab1-b681-5876399b4ce2' WHERE gallery_id = 'fdf53b31-a6dd-4bd9-9ede-7f57568f7071';
  UPDATE sales SET gallery_id = 'c3f49c24-eddf-4ab1-b681-5876399b4ce2' WHERE gallery_id = 'fdf53b31-a6dd-4bd9-9ede-7f57568f7071';
  DELETE FROM galleries WHERE id = 'fdf53b31-a6dd-4bd9-9ede-7f57568f7071';
  v_count := v_count + 1;
  RAISE NOTICE '2/21 Alte Brennerei merged';

  -- 3. Artstübli: 448dbcb2 (Kunst & Kultur) → e99b34af (Urban Art & Culture)
  UPDATE artworks SET gallery_id = 'e99b34af-b9fb-4a5d-8fd2-79a40bdadce5' WHERE gallery_id = '448dbcb2-f760-4feb-b611-5d03786342b7';
  UPDATE sales SET gallery_id = 'e99b34af-b9fb-4a5d-8fd2-79a40bdadce5' WHERE gallery_id = '448dbcb2-f760-4feb-b611-5d03786342b7';
  DELETE FROM galleries WHERE id = '448dbcb2-f760-4feb-b611-5d03786342b7';
  v_count := v_count + 1;
  RAISE NOTICE '3/21 Artstübli merged';

  -- 4. Aurum Gallery: 3fc7cf78 → cc528e7f
  UPDATE artworks SET gallery_id = 'cc528e7f-1148-4bdb-a23f-59795a46b905' WHERE gallery_id = '3fc7cf78-11b4-46a7-a5c4-74344a2e5077';
  UPDATE sales SET gallery_id = 'cc528e7f-1148-4bdb-a23f-59795a46b905' WHERE gallery_id = '3fc7cf78-11b4-46a7-a5c4-74344a2e5077';
  DELETE FROM galleries WHERE id = '3fc7cf78-11b4-46a7-a5c4-74344a2e5077';
  v_count := v_count + 1;
  RAISE NOTICE '4/21 Aurum Gallery merged';

  -- 5. Berengo Studio: 35803bbb → 122e69bf
  UPDATE artworks SET gallery_id = '122e69bf-c012-4487-9a88-7dd03cf6b0e8' WHERE gallery_id = '35803bbb-1cfa-4591-8c83-059d17d6cc1a';
  UPDATE sales SET gallery_id = '122e69bf-c012-4487-9a88-7dd03cf6b0e8' WHERE gallery_id = '35803bbb-1cfa-4591-8c83-059d17d6cc1a';
  DELETE FROM galleries WHERE id = '35803bbb-1cfa-4591-8c83-059d17d6cc1a';
  v_count := v_count + 1;
  RAISE NOTICE '5/21 Berengo Studio merged';

  -- 6. Carte Blanche: 28eee698 → df34c188
  UPDATE artworks SET gallery_id = 'df34c188-26b0-4deb-905f-1e869f0f0f2b' WHERE gallery_id = '28eee698-c735-4aab-be09-d589921af683';
  UPDATE sales SET gallery_id = 'df34c188-26b0-4deb-905f-1e869f0f0f2b' WHERE gallery_id = '28eee698-c735-4aab-be09-d589921af683';
  DELETE FROM galleries WHERE id = '28eee698-c735-4aab-be09-d589921af683';
  v_count := v_count + 1;
  RAISE NOTICE '6/21 Carte Blanche merged';

  -- 7. Corpus Artis: c2f5984b → feba7a12
  UPDATE artworks SET gallery_id = 'feba7a12-a7ec-4ecd-ae04-8c4a38a78841' WHERE gallery_id = 'c2f5984b-8508-4a1b-a544-99c35206c393';
  UPDATE sales SET gallery_id = 'feba7a12-a7ec-4ecd-ae04-8c4a38a78841' WHERE gallery_id = 'c2f5984b-8508-4a1b-a544-99c35206c393';
  DELETE FROM galleries WHERE id = 'c2f5984b-8508-4a1b-a544-99c35206c393';
  v_count := v_count + 1;
  RAISE NOTICE '7/21 Corpus Artis merged';

  -- 8. Cris Contini Contemporary: 86c83b28 → a426f4f3
  UPDATE artworks SET gallery_id = 'a426f4f3-c5dd-42da-a8c9-b7878a3a2bed' WHERE gallery_id = '86c83b28-3695-4a2e-92be-36cf6f370682';
  UPDATE sales SET gallery_id = 'a426f4f3-c5dd-42da-a8c9-b7878a3a2bed' WHERE gallery_id = '86c83b28-3695-4a2e-92be-36cf6f370682';
  DELETE FROM galleries WHERE id = '86c83b28-3695-4a2e-92be-36cf6f370682';
  v_count := v_count + 1;
  RAISE NOTICE '8/21 Cris Contini Contemporary merged';

  -- 9. Fabien Castanier Gallery: 217d4ba9 → 872b5912
  UPDATE artworks SET gallery_id = '872b5912-1403-4111-8f93-99f81e297b89' WHERE gallery_id = '217d4ba9-93db-4bb0-b97f-056b7ea7c84e';
  UPDATE sales SET gallery_id = '872b5912-1403-4111-8f93-99f81e297b89' WHERE gallery_id = '217d4ba9-93db-4bb0-b97f-056b7ea7c84e';
  DELETE FROM galleries WHERE id = '217d4ba9-93db-4bb0-b97f-056b7ea7c84e';
  v_count := v_count + 1;
  RAISE NOTICE '9/21 Fabien Castanier Gallery merged';

  -- 10. Sacchetti: d114675b (Galleria) → d6a40fba (Galeria)
  UPDATE artworks SET gallery_id = 'd6a40fba-efa4-489c-82b4-b0379501f069' WHERE gallery_id = 'd114675b-c398-4e3f-82a9-209a369a5448';
  UPDATE sales SET gallery_id = 'd6a40fba-efa4-489c-82b4-b0379501f069' WHERE gallery_id = 'd114675b-c398-4e3f-82a9-209a369a5448';
  DELETE FROM galleries WHERE id = 'd114675b-c398-4e3f-82a9-209a369a5448';
  v_count := v_count + 1;
  RAISE NOTICE '10/21 Sacchetti merged';

  -- 11. Galerie One: c4ef9d13 → 441bf6a5
  UPDATE artworks SET gallery_id = '441bf6a5-76e2-44f9-98bc-2bf3faa0c6a1' WHERE gallery_id = 'c4ef9d13-752b-4f49-937c-3f4f57d99446';
  UPDATE sales SET gallery_id = '441bf6a5-76e2-44f9-98bc-2bf3faa0c6a1' WHERE gallery_id = 'c4ef9d13-752b-4f49-937c-3f4f57d99446';
  DELETE FROM galleries WHERE id = 'c4ef9d13-752b-4f49-937c-3f4f57d99446';
  v_count := v_count + 1;
  RAISE NOTICE '11/21 Galerie One merged';

  -- 12. Impeccable Imagination: 1be367f7 → fed1a434
  UPDATE artworks SET gallery_id = 'fed1a434-50a2-4959-888b-e2dbd0bf5034' WHERE gallery_id = '1be367f7-ac96-4db7-af79-7685e3162616';
  UPDATE sales SET gallery_id = 'fed1a434-50a2-4959-888b-e2dbd0bf5034' WHERE gallery_id = '1be367f7-ac96-4db7-af79-7685e3162616';
  DELETE FROM galleries WHERE id = '1be367f7-ac96-4db7-af79-7685e3162616';
  v_count := v_count + 1;
  RAISE NOTICE '12/21 Impeccable Imagination merged';

  -- 13. La Villa/Villart: 1d737364 → 0a5c53f1
  UPDATE artworks SET gallery_id = '0a5c53f1-c277-44c8-9295-98db76cc0c50' WHERE gallery_id = '1d737364-5921-4125-88e1-50113eb2d585';
  UPDATE sales SET gallery_id = '0a5c53f1-c277-44c8-9295-98db76cc0c50' WHERE gallery_id = '1d737364-5921-4125-88e1-50113eb2d585';
  DELETE FROM galleries WHERE id = '1d737364-5921-4125-88e1-50113eb2d585';
  v_count := v_count + 1;
  RAISE NOTICE '13/21 La Villa Calvi merged';

  -- 14. Laurent Marthaler: 5c01b5e0 → 0c182ec7 (Contemporary)
  UPDATE artworks SET gallery_id = '0c182ec7-f3e0-4345-8f5f-9abfb007b334' WHERE gallery_id = '5c01b5e0-e140-4fd7-8c57-a7e000a6ffd4';
  UPDATE sales SET gallery_id = '0c182ec7-f3e0-4345-8f5f-9abfb007b334' WHERE gallery_id = '5c01b5e0-e140-4fd7-8c57-a7e000a6ffd4';
  DELETE FROM galleries WHERE id = '5c01b5e0-e140-4fd7-8c57-a7e000a6ffd4';
  v_count := v_count + 1;
  RAISE NOTICE '14/21 Laurent Marthaler merged';

  -- 15. Luca Fine Art: cfec49a3 → 172ba695
  UPDATE artworks SET gallery_id = '172ba695-c525-4832-9a59-f4dec0f923b2' WHERE gallery_id = 'cfec49a3-46eb-4aa4-8e04-66f83e17f6ea';
  UPDATE sales SET gallery_id = '172ba695-c525-4832-9a59-f4dec0f923b2' WHERE gallery_id = 'cfec49a3-46eb-4aa4-8e04-66f83e17f6ea';
  DELETE FROM galleries WHERE id = 'cfec49a3-46eb-4aa4-8e04-66f83e17f6ea';
  v_count := v_count + 1;
  RAISE NOTICE '15/21 Luca Fine Art merged';

  -- 16. Mazel Galerie: 13c6bcb2 → 9070322f
  UPDATE artworks SET gallery_id = '9070322f-2a38-446d-9d10-e65b0dd85f84' WHERE gallery_id = '13c6bcb2-b1bf-4195-848d-6cfeb9604abf';
  UPDATE sales SET gallery_id = '9070322f-2a38-446d-9d10-e65b0dd85f84' WHERE gallery_id = '13c6bcb2-b1bf-4195-848d-6cfeb9604abf';
  DELETE FROM galleries WHERE id = '13c6bcb2-b1bf-4195-848d-6cfeb9604abf';
  v_count := v_count + 1;
  RAISE NOTICE '16/21 Mazel Galerie merged';

  -- 17. NOA: 6b00d1d9 (Contemporary) → da1fed8e (contemporary)
  UPDATE artworks SET gallery_id = 'da1fed8e-4a24-4b42-bb30-35e05fb5dc1e' WHERE gallery_id = '6b00d1d9-41a1-48fb-85f9-0099d340eaa3';
  UPDATE sales SET gallery_id = 'da1fed8e-4a24-4b42-bb30-35e05fb5dc1e' WHERE gallery_id = '6b00d1d9-41a1-48fb-85f9-0099d340eaa3';
  DELETE FROM galleries WHERE id = '6b00d1d9-41a1-48fb-85f9-0099d340eaa3';
  v_count := v_count + 1;
  RAISE NOTICE '17/21 NOA Contemporary merged';

  -- 18. Spacejunk: 1fab7ac8 (Grenoble) → 2a1bf054
  UPDATE artworks SET gallery_id = '2a1bf054-2a6a-4801-96cc-b7cc39fc603b' WHERE gallery_id = '1fab7ac8-2f85-40d7-9a4e-394aef85c04d';
  UPDATE sales SET gallery_id = '2a1bf054-2a6a-4801-96cc-b7cc39fc603b' WHERE gallery_id = '1fab7ac8-2f85-40d7-9a4e-394aef85c04d';
  DELETE FROM galleries WHERE id = '1fab7ac8-2f85-40d7-9a4e-394aef85c04d';
  v_count := v_count + 1;
  RAISE NOTICE '18/21 Spacejunk merged';

  -- 19. Tres Art: 0a50ccd1 (Art Galerie Tres Art) → 9392445f (Tres Art Galerie)
  UPDATE artworks SET gallery_id = '9392445f-7eec-4262-a4ad-f384877e0038' WHERE gallery_id = '0a50ccd1-b91f-415b-a616-31cff1fdb8a8';
  UPDATE sales SET gallery_id = '9392445f-7eec-4262-a4ad-f384877e0038' WHERE gallery_id = '0a50ccd1-b91f-415b-a616-31cff1fdb8a8';
  DELETE FROM galleries WHERE id = '0a50ccd1-b91f-415b-a616-31cff1fdb8a8';
  v_count := v_count + 1;
  RAISE NOTICE '19/21 Tres Art merged';

  -- 20. Underdogs Gallery: acef0223 → e7ca62f7
  UPDATE artworks SET gallery_id = 'e7ca62f7-08a8-4572-99e4-29e1625108c0' WHERE gallery_id = 'acef0223-b7ce-403f-9906-131d8b30ef91';
  UPDATE sales SET gallery_id = 'e7ca62f7-08a8-4572-99e4-29e1625108c0' WHERE gallery_id = 'acef0223-b7ce-403f-9906-131d8b30ef91';
  DELETE FROM galleries WHERE id = 'acef0223-b7ce-403f-9906-131d8b30ef91';
  v_count := v_count + 1;
  RAISE NOTICE '20/21 Underdogs Gallery merged';

  -- 21. West Chelsea Contemporary: e8367b20 → 26ff6766, then delete test 927997ff
  UPDATE artworks SET gallery_id = '26ff6766-6777-4d5e-bc92-6cc4a4de410b' WHERE gallery_id = 'e8367b20-1d3b-4026-8602-4250e8e2013e';
  UPDATE sales SET gallery_id = '26ff6766-6777-4d5e-bc92-6cc4a4de410b' WHERE gallery_id = 'e8367b20-1d3b-4026-8602-4250e8e2013e';
  DELETE FROM galleries WHERE id = 'e8367b20-1d3b-4026-8602-4250e8e2013e';
  DELETE FROM galleries WHERE id = '927997ff-f9f8-47e0-9560-9478b4427efa';
  v_count := v_count + 1;
  RAISE NOTICE '21/21 West Chelsea Contemporary merged + test deleted';

  RAISE NOTICE 'Consolidation complete: % gallery merges executed', v_count;
END $$;
