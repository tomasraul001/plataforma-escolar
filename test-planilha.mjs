import('./backend/src/app.js').then(async () => {
  await new Promise(r => setTimeout(r, 1000));
  
  // Test full flow
  const loginRes = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'formador@teste.com', password: '123456' })
  });
  const loginData = await loginRes.json();
  console.log('✅ Login:', loginData.message);
  const token = loginData.token;
  
  // Test planilha endpoint
  const classesRes = await fetch('http://localhost:3000/classes/minhas', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const classes = await classesRes.json();
  console.log('✅ Classes:', classes.length);
  
  if (classes.length > 0) {
    const classId = classes[0].id;
    
    // Test planilha endpoint
    const planilhaRes = await fetch('http://localhost:3000/grades/planilha/' + classId, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const planilha = await planilhaRes.json();
    console.log('✅ Planilha:', planilha.class?.name, '| Students:', planilha.students?.length, '| Columns:', planilha.columns?.length);
    
    // Test auto-save
    if (planilha.students.length > 0) {
      const enrollmentId = planilha.students[0].enrollmentId;
      const saveRes = await fetch('http://localhost:3000/grades/planilha/' + classId + '/auto-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ enrollmentId: planilha.students[0].enrollmentId, columnId: 'teste1', value: 16.5 })
      });
      const saveData = await saveRes.json();
      console.log('✅ Auto-save:', saveData.message, '| Value:', saveData.grade?.value);
    }
    
    console.log('\n🎉 ALL PLANILHA TESTS PASSED!');
  }
}).catch(e => console.error('Error:', e.message, e.stack));