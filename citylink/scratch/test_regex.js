
const phoneRegex = /^(\+)?251[789]\d{8}$/;

const numbers = [
  '+251904030403',
  '+251911178024',
  '+251922222222',
  '+251913162911',
  '+251973477392',
  '+251900001111'
];

numbers.forEach(n => {
  console.log(`${n}: ${phoneRegex.test(n)}`);
});
